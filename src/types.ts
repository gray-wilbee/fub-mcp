export type ParamLocation = "query" | "path" | "body";

export interface ParamMeta {
  name: string;
  in: ParamLocation;
  required: boolean;
  description?: string;
  schema?: Record<string, unknown>;
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
}
