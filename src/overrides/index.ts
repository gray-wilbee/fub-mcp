import { ToolDef } from "../types.js";

/**
 * Tools that don't exist in FUB's published OpenAPI spec at all, but are
 * confirmed working against the live API (verified 2026-09 with real GET
 * requests). Kept separate from generate-tools.ts since there's no spec
 * entry to derive them from.
 */
export const extraTools: ToolDef[] = [
  {
    name: "list_notes",
    description:
      "List notes, optionally filtered by person. This endpoint is NOT in FUB's " +
      "published API docs (only GET /notes/{id} is documented there), but the plural " +
      "GET /notes endpoint works today and supports filtering by personId — confirmed " +
      "against the live API. Since it's undocumented, treat it as best-effort: if FUB " +
      "changes this behavior, fall back to get_note by id. " +
      "(GET /notes) Defaults to limit=100. This endpoint paginates via a cursor, not " +
      "offset: pass the previous response's _metadata.next value as `next` to get the " +
      "following page.",
    method: "GET",
    pathTemplate: "/notes",
    params: [
      {
        name: "personId",
        in: "query",
        required: false,
        description: "Only return notes for this person ID.",
      },
      {
        name: "limit",
        in: "query",
        required: false,
        description: "Number of results to return. Max 100.",
        schema: { type: "integer", default: 100 },
      },
      {
        name: "next",
        in: "query",
        required: false,
        description:
          "Cursor from a previous response's _metadata.next, to fetch the next page.",
      },
    ],
    hasExtraQuery: true,
    hasExtraBody: false,
    isDelete: false,
  },
];

/**
 * Per-tool description/behavior patches applied on top of the generated
 * (or extra) tool of the same name. Only add an entry here when the
 * generated description genuinely needs correcting or enriching — most
 * endpoints are fine as generated.
 */
export const descriptionAppendix: Record<string, string> = {
  update_person:
    " Tag removal has no dedicated endpoint: to remove a tag, first GET this person, " +
    "filter the tag out of their current `tags` array yourself, then PUT the full " +
    "filtered array back (with mergeTags left at its default of false so it replaces " +
    "rather than merges). To add tags, just pass the new tags with mergeTags=true " +
    "(this tool's default) so they're unioned with the person's existing tags.",
  create_note:
    " If `body` contains HTML markup, you must also pass isHtml=true — unlike email " +
    "templates, FUB does not auto-detect HTML in notes.",
  update_note:
    " If `body` contains HTML markup, you must also pass isHtml=true.",
  create_template:
    " `body` is the raw HTML of the email template directly — there is no separate " +
    "isHtml/html flag for templates (unlike notes, which need isHtml=true explicitly).",
};

/**
 * Patches a param's exposed JSON-schema `default`. This is the single source
 * of truth for "what value applies when the caller omits this argument" —
 * tools.ts's executeTool reads the same `schema.default` at request time, so
 * the exposed schema can never drift from actual runtime behavior the way a
 * separately-maintained defaults map could (and once did, for this exact
 * param — the schema said mergeTags defaults to false, inherited verbatim
 * from FUB's spec, while the description and runtime both said true).
 * Keyed by tool name -> { paramName: defaultValue }.
 */
export const paramDefaultOverrides: Record<string, Record<string, unknown>> = {
  update_person: { mergeTags: true },
};
