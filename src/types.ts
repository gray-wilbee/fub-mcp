export type ParamLocation = "query" | "path" | "body";

export interface ParamMeta {
  name: string;
  in: ParamLocation;
  required: boolean;
  description?: string;
  schema?: Record<string, unknown>;
  /**
   * When true, executeTool sends `schema.default` if the caller omits this
   * argument, rather than leaving it out of the request entirely. Only set
   * for params where we deliberately want different behavior than FUB's own
   * server-side default (limit=100 instead of 10; mergeTags=true instead of
   * false) — NOT a blanket "always apply the spec's declared default", since
   * for every other param that would mean assuming explicitly sending FUB's
   * documented default is always identical to omitting the param, which
   * isn't something we've verified against the live API.
   */
  applyDefaultIfOmitted?: boolean;
}

export interface ToolDef {
  name: string;
  description: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  pathTemplate: string; // e.g. "/people/{id}"
  params: ParamMeta[];
  hasExtraQuery: boolean;
  hasExtraBody: boolean;
  isDelete: boolean;
  /** Non-delete but still hard-to-undo/visible-to-others — needs confirm=true. */
  requiresConfirm?: boolean;
}
