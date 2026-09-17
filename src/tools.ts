import { generateTools } from "./openapi/generate-tools.js";
import {
  extraTools,
  descriptionAppendix,
  paramDefaultOverrides,
} from "./overrides/index.js";
import { FubConfig } from "./auth.js";
import { fubRequest } from "./http.js";
import { ToolDef } from "./types.js";

export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
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
      out[key] = value;
    } else {
      out[key] = sanitizeSchema(value);
    }
  }
  return out;
}

const CONFIRM_NOTICE =
  " DESTRUCTIVE: this permanently deletes data in the user's live CRM. Do not call " +
  "this until the user has explicitly confirmed, in this conversation, that they want " +
  "this specific record deleted (name/identify the record back to them and wait for a " +
  "clear yes). Requires confirm=true.";

export function buildToolDefs(config: FubConfig): ToolDef[] {
  const all = [...generateTools(), ...extraTools];

  for (const tool of all) {
    if (descriptionAppendix[tool.name]) {
      tool.description += descriptionAppendix[tool.name];
    }
    if (tool.isDelete) {
      tool.description += CONFIRM_NOTICE;
    }

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

  if (config.allowDelete) {
    return all;
  }
  return all.filter((t) => !t.isDelete);
}

export function toMcpSchema(tool: ToolDef): McpToolSchema {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of tool.params) {
    properties[param.name] = sanitizeSchema({
      ...(param.schema ?? { type: "string" }),
      description: param.description,
    });
    if (param.required) required.push(param.name);
  }

  if (tool.hasExtraQuery) {
    properties.extraQuery = {
      type: "object",
      description:
        "Extra raw query parameters not explicitly listed above — e.g. FUB custom " +
        "field filters like custom.ClosingDate on /people or /deals. Keys and values " +
        "are sent as-is.",
      additionalProperties: true,
    };
  }
  if (tool.hasExtraBody) {
    properties.extraBody = {
      type: "object",
      description:
        "Extra raw JSON body fields not explicitly listed above — e.g. custom.* " +
        "fields when creating/updating people or deals. Keys and values are sent as-is.",
      additionalProperties: true,
    };
  }

  if (tool.isDelete) {
    properties.confirm = {
      type: "boolean",
      description:
        "Must be true. Only set this after the user has explicitly confirmed they " +
        "want this specific record deleted.",
    };
    required.push("confirm");
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: { type: "object", properties, required },
  };
}

export async function executeTool(
  config: FubConfig,
  tool: ToolDef,
  args: Record<string, unknown>
): Promise<unknown> {
  if (tool.isDelete) {
    if (!config.allowDelete) {
      throw new Error(
        `${tool.name} is disabled. Set FUB_MCP_ALLOW_DELETE=1 in this server's ` +
          "environment to enable delete tools."
      );
    }
    if (args.confirm !== true) {
      throw new Error(
        `${tool.name} requires confirm=true. Do not set this without explicit, ` +
          "specific confirmation from the user for this exact record."
      );
    }
  }

  let path = tool.pathTemplate;
  const query: Record<string, unknown> = {};
  const body: Record<string, unknown> = {};

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

  if (tool.hasExtraQuery && args.extraQuery && typeof args.extraQuery === "object") {
    Object.assign(query, args.extraQuery as Record<string, unknown>);
  }
  if (tool.hasExtraBody && args.extraBody && typeof args.extraBody === "object") {
    Object.assign(body, args.extraBody as Record<string, unknown>);
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
  });

  return res.data;
}
