import spec from "./fub-openapi.json" with { type: "json" };
import { ParamMeta, ToolDef } from "../types.js";

interface OpenApiParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
}

interface OpenApiOperation {
  summary?: string;
  description?: string;
  parameters?: OpenApiParameter[];
  requestBody?: {
    content?: {
      "application/json"?: {
        schema?: {
          type?: string;
          properties?: Record<string, Record<string, unknown>>;
          required?: string[];
        };
      };
    };
  };
}

const HTTP_METHODS = ["get", "post", "put", "delete", "patch"] as const;

function toSnake(segment: string): string {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase();
}

const SINGLETON_ROOTS = new Set(["me", "identity"]);

function singularize(word: string): string {
  if (word === "people" || word.endsWith("_people")) {
    return word.slice(0, -"people".length) + "person";
  }
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("sses")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** Normalizes `:id`-style path params (used inconsistently in a couple of spec
 * entries) to the standard `{id}` style, and strips a redundant leading `/v1`
 * segment that appears on 2 endpoints even though BASE_URL already ends in
 * `/v1` (confirmed via live requests: the literal spec path 404s, the
 * single-/v1 version works). */
function normalizePath(path: string): string {
  const withBraces = path.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
  return withBraces.startsWith("/v1/") ? withBraces.slice(3) : withBraces;
}

function deriveName(method: string, path: string): string {
  const segs = path.split("/").filter(Boolean);
  const hasParam = segs.some((s) => s.startsWith("{"));
  const lastIsParam = segs.length > 0 && segs[segs.length - 1].startsWith("{");
  const literalSegs = segs.filter((s) => !s.startsWith("{")).map(toSnake);
  const bareRoot = !hasParam && segs.length === 1;

  if (bareRoot) {
    if (method === "get") {
      return SINGLETON_ROOTS.has(literalSegs[0])
        ? `get_${literalSegs[0]}`
        : `list_${literalSegs[0]}`;
    }
    if (method === "post") return `create_${singularize(literalSegs[0])}`;
    return `${method}_${literalSegs[0]}`;
  }

  if (lastIsParam && literalSegs.length > 0) {
    const base = singularize(literalSegs[literalSegs.length - 1]);
    if (method === "get") return `get_${base}`;
    if (method === "put") return `update_${base}`;
    if (method === "delete") return `delete_${base}`;
    if (method === "post") return `create_${base}`;
    return `${method}_${base}`;
  }

  // Compound literal action path with no id, e.g. /people/checkDuplicate,
  // /groups/roundRobin, /templates/merge, /inboxApps/{id}/message (mixed).
  const verb = method === "get" ? "get" : method === "post" ? "post" : method;
  return `${verb}_${literalSegs.join("_")}`;
}

function buildParams(op: OpenApiOperation, pathTemplate: string): ParamMeta[] {
  const params: ParamMeta[] = [];

  for (const seg of pathTemplate.split("/")) {
    if (seg.startsWith("{") && seg.endsWith("}")) {
      params.push({ name: seg.slice(1, -1), in: "path", required: true });
    }
  }

  for (const p of op.parameters ?? []) {
    if (p.in !== "query") continue; // path params already captured above
    params.push({
      name: p.name,
      in: "query",
      required: Boolean(p.required),
      description: p.description,
      schema: p.schema,
    });
  }

  const bodySchema = op.requestBody?.content?.["application/json"]?.schema;
  if (bodySchema?.properties) {
    const requiredSet = new Set(bodySchema.required ?? []);
    for (const [name, schema] of Object.entries(bodySchema.properties)) {
      params.push({
        name,
        in: "body",
        required: requiredSet.has(name),
        description: (schema as Record<string, unknown>).description as
          | string
          | undefined,
        schema: schema as Record<string, unknown>,
      });
    }
  }

  return params;
}

function buildDescription(
  path: string,
  method: string,
  op: OpenApiOperation,
  params: ParamMeta[]
): string {
  const parts: string[] = [];
  parts.push(op.description || op.summary || `${method.toUpperCase()} ${path}`);
  parts.push(`(${method.toUpperCase()} ${path})`);

  const limitParam = params.find((p) => p.name === "limit" && p.in === "query");
  if (limitParam) {
    parts.push(
      "Defaults to limit=100 (FUB's max per page) rather than its own default of 10 — bulk requests are the common case here. " +
        "If the response's _metadata shows more results remain, keep paginating: use `offset` for offset-based endpoints, " +
        "or the `_metadata.next` cursor value (as the `next` argument) for cursor-based endpoints like notes."
    );
  }

  const fieldsParam = params.find((p) => p.name === "fields" && p.in === "query");
  if (fieldsParam) {
    parts.push(
      "Use `fields` to request only what you need instead of full records when scanning many people. " +
        "For custom fields, call list_custom_fields first to discover the exact field names/labels rather than guessing."
    );
  }

  return parts.join(" ");
}

export function generateTools(): ToolDef[] {
  const tools: ToolDef[] = [];
  const paths = (spec as { paths: Record<string, Record<string, OpenApiOperation>> })
    .paths;

  for (const [rawPath, methods] of Object.entries(paths)) {
    const path = normalizePath(rawPath);
    for (const method of HTTP_METHODS) {
      const op = methods[method];
      if (!op) continue;

      const params = buildParams(op, path);
      const name = deriveName(method, path);
      const description = buildDescription(path, method, op, params);
      const isBodyCapable = method === "post" || method === "put" || method === "patch";

      tools.push({
        name,
        description,
        method: method.toUpperCase() as ToolDef["method"],
        pathTemplate: path,
        params,
        hasExtraQuery: true,
        hasExtraBody: isBodyCapable,
        isDelete: method === "delete",
      });
    }
  }

  // De-dupe any accidental name collisions by appending the method.
  const seen = new Map<string, number>();
  for (const tool of tools) {
    const count = seen.get(tool.name) ?? 0;
    seen.set(tool.name, count + 1);
    if (count > 0) {
      tool.name = `${tool.name}_${tool.method.toLowerCase()}`;
    }
  }

  return tools;
}
