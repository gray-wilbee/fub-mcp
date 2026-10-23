import { accessError, validateWebhook } from "./policy.js";
import { validateInput } from "./validation.js";
import { generateTools } from "./openapi/generate-tools.js";
import {
  extraTools,
  descriptionAppendix,
  paramDefaultOverrides,
  highBlastRadiusDeletes,
} from "./overrides/index.js";
import { FubConfig } from "./auth.js";
import { fubRequest } from "./http.js";
import { ToolDef } from "./types.js";

export interface McpToolSchema {
  name: string;
  description: string;
  annotations?: { readOnlyHint: boolean; destructiveHint: boolean; openWorldHint: boolean };
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
}

const SAFE_PROP_NAME = /^[a-zA-Z0-9_.-]{1,64}$/;

/**
 * Recursively strips any object property whose name Anthropic's tool-schema
 * validator would reject (e.g. FUB's spec has a literal "custom*" wildcard
 * placeholder buried inside a nested object at least once — POST /events'
 * `person` sub-schema — not just at the top level). A rejected nested name
 * fails the *whole* tool, same as a top-level one, so this has to recurse
 * into properties/items/additionalProperties everywhere, not just once.
 */
function sanitizeSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(sanitizeSchema);
  }
  if (schema === null || typeof schema !== "object") {
    return schema;
  }
  const input = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "properties" && value && typeof value === "object") {
      const cleaned: Record<string, unknown> = {};
      for (const [propName, propSchema] of Object.entries(
        value as Record<string, unknown>
      )) {
        if (SAFE_PROP_NAME.test(propName)) {
          cleaned[propName] = sanitizeSchema(propSchema);
        }
      }
      out[key] = cleaned;
    } else if (key === "required" && Array.isArray(value)) {
      // Drop required-list entries for anything we just filtered out above.
      out[key] = value.filter(name => typeof name === "string" && SAFE_PROP_NAME.test(name));
    } else {
      out[key] = sanitizeSchema(value);
    }
  }
  if (input.properties) out.additionalProperties = false;
  return out;
}

const CONFIRM_NOTICE =
  " DESTRUCTIVE: this permanently deletes data in the user's live CRM. Do not call " +
  "this until the user has explicitly confirmed, in this conversation, that they want " +
  "this specific record deleted (name/identify the record back to them and wait for a " +
  "clear yes). Requires confirm=true.";

const BLAST_RADIUS_NOTICE =
  " HIGH BLAST RADIUS: unlike deleting a single note or task, this can affect every " +
  "record that referenced it (e.g. every contact in a deleted stage, every record " +
  "with this custom field populated). Be extra explicit with the user about what " +
  "else this will affect before calling it.";

const SEND_CONFIRM_NOTICE =
  " Requires confirm=true after approval of this specific change and any workflow " +
  "or communication effects. Caller confirmation is not independent human authorization.";

export function buildToolDefs(config: FubConfig): ToolDef[] {
  const all = [...generateTools(), ...extraTools];

  for (const tool of all) {
    tool.requiresConfirm = tool.method !== "GET";
    if (descriptionAppendix[tool.name]) {
      tool.description += descriptionAppendix[tool.name];
    }
    if (tool.isDelete) {
      tool.description += CONFIRM_NOTICE;
      if (highBlastRadiusDeletes.has(tool.name)) {
        tool.description += BLAST_RADIUS_NOTICE;
      }
    }
    if (tool.method !== "GET" && !tool.isDelete) tool.description += SEND_CONFIRM_NOTICE;

    const overrides = paramDefaultOverrides[tool.name];
    if (overrides) {
      for (const param of tool.params) {
        if (overrides[param.name] !== undefined) {
          param.schema = { ...(param.schema ?? {}), default: overrides[param.name] };
          param.applyDefaultIfOmitted = true;
        }
      }
    }
  }

  return all.filter(tool => !accessError(config, tool));
}

export function toMcpSchema(tool: ToolDef): McpToolSchema {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of tool.params) {
    const limits = param.name === "limit" && param.in === "query" ? { type: "integer", minimum: 1, maximum: 100 } : {};
    properties[param.name] = sanitizeSchema({
      ...(param.schema ?? { type: "string" }),
      ...limits,
      description: param.description,
    });
    if (param.required) required.push(param.name);
  }

  if (tool.hasExtraQuery) {
    properties.extraQuery = {
      type: "object",
      description:
        "Custom query fields only — e.g. FUB custom " +
        "field filters like custom.ClosingDate on /people or /deals. Keys and values " +
        "are sent as-is.",
      additionalProperties: { type: ["string", "number", "boolean", "null"] },
    };
  }
  if (tool.hasExtraBody) {
    properties.extraBody = {
      type: "object",
      description:
        "Custom JSON body fields (and update_person collaborators) — e.g. custom.* " +
        "fields when creating/updating people or deals. Keys and values are sent as-is.",
      additionalProperties: true,
    };
  }

  if (tool.method !== "GET") {
    properties.confirm = {
      type: "boolean",
      description: tool.isDelete
        ? "Must be true. Only set this after the user has explicitly confirmed they " +
          "want this specific record deleted."
        : "Must be true. Only set this after the user has explicitly confirmed the " +
          "specific record change and any recipients/content or workflow side effects.",
    };
    required.push("confirm");
  }

  return {
    name: tool.name,
    description: tool.description,
    annotations: { readOnlyHint: tool.method === "GET", destructiveHint: tool.method !== "GET", openWorldHint: true },
    inputSchema: { type: "object", properties, required, additionalProperties: false },
  };
}

export async function executeTool(
  config: FubConfig,
  tool: ToolDef,
  args: Record<string, unknown>,
  signal?: AbortSignal
): Promise<unknown> {
  const denied = accessError(config, tool);
  if (denied) throw new Error(denied);
  validateInput(tool, toMcpSchema(tool).inputSchema, args);

  if (tool.method !== "GET" && args.confirm !== true) {
    throw new Error(
      `${tool.name} requires confirm=true. Do not set this without explicit, ` +
        "specific confirmation from the user first."
    );
  }

  let path = tool.pathTemplate;
  const query: Record<string, unknown> = Object.create(null);
  const body: Record<string, unknown> = Object.create(null);

  for (const param of tool.params) {
    // Falls back to the schema's own `default` only for params we've
    // deliberately flagged (limit, mergeTags) — same value shown to the
    // model in the tool's JSON schema, so documented and actual behavior
    // can't drift apart the way the old separate defaults map once did.
    const schemaDefault = param.applyDefaultIfOmitted
      ? (param.schema as { default?: unknown } | undefined)?.default
      : undefined;
    const value = args[param.name] !== undefined ? args[param.name] : schemaDefault;
    if (value === undefined) continue;
    if (param.in === "path") {
      path = path.replace(`{${param.name}}`, encodeURIComponent(String(value)));
    } else if (param.in === "query") {
      query[param.name] = value;
    } else {
      body[param.name] = value;
    }
  }

  // Extras cannot override any declared field, even if that field was omitted.
  for (const [extraName, target] of [["extraQuery", query], ["extraBody", body]] as const) {
    const extra = args[extraName] as Record<string, unknown> | undefined;
    if (!extra) continue;
    for (const [key, value] of Object.entries(extra)) {
      if (tool.params.some(p => p.name === key) || key === "confirm") throw new Error("Extra fields cannot override declared parameters.");
      const custom = /^custom[A-Za-z0-9_.-]{1,100}$/.test(key);
      const collaborators = extraName === "extraBody" && tool.name === "update_person" && key === "collaborators";
      if (!custom && !collaborators) throw new Error("Extras support custom fields and update_person collaborators only.");
      if (collaborators && (!Array.isArray(value) || !value.every(v => Number.isSafeInteger(v) && Number(v) > 0))) throw new Error("Collaborators must be an array of positive user IDs.");
      if (custom && value !== null && !["string", "number", "boolean"].includes(typeof value)) throw new Error("Custom field values must be scalar JSON values.");
      target[key] = value;
    }
  }
  validateWebhook(config, tool, body);

  if (
    tool.name === "update_person" &&
    typeof body.stage === "string" &&
    body.stage.toLowerCase() === "trash" &&
    args.confirm !== true
  ) {
    throw new Error(
      "update_person requires confirm=true when setting stage to \"Trash\" — " +
        "confirm with the user first, since it hides the contact from default views."
    );
  }

  if (path.includes("{")) {
    throw new Error(`Missing required path parameter(s) in ${tool.name}: ${path}`);
  }

  const hasBody = ["POST", "PUT", "PATCH"].includes(tool.method);
  const res = await fubRequest(config, {
    method: tool.method,
    path,
    query,
    body: hasBody ? body : undefined,
    signal,
  });

  return res.data;
}
