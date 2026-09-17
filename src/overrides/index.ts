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
    "(this tool's default) so they're unioned with the person's existing tags. " +
    "⚠️ DATA LOSS RISK, confirmed against the live API: `emails`, `phones`, and " +
    "`addresses` are REPLACED wholesale if you include them — there is no merge " +
    "flag for these like there is for tags. Sending a single new phone number wipes " +
    "out every other phone number the person had. To add one without losing the " +
    "rest, GET the person first, append to their existing emails/phones/addresses " +
    "array yourself, and PUT the complete merged array back. Never send a partial " +
    "list unless the user explicitly wants everything else removed. " +
    "`collaborators` is also settable here even though FUB's own docs don't list it " +
    "on this endpoint (confirmed working in practice) — it has the same replace-not-" +
    "merge behavior as tags/phones: omitting an existing collaborator's user id " +
    "removes them, so GET the person first and merge if you only want to add one. " +
    "Pass it via `extraBody`. " +
    "Setting `stage` to \"Trash\" hides the person from default list views (FUB " +
    "excludes trashed people from GET /people unless includeTrash is set) — it's " +
    "reversible, but feels like the contact vanished to someone who isn't expecting " +
    "it, so this requires confirm=true just like a delete, even though it isn't one.",
  create_person:
    " `deduplicate` defaults to false, meaning creating a person whose email or " +
    "phone matches an existing contact creates a SEPARATE duplicate record rather " +
    "than erring or merging — a common way CRMs end up full of duplicate leads. " +
    "Unless the user clearly wants an intentional second/separate record (e.g. a " +
    "shared household phone), pass deduplicate=true, or call " +
    "get_people_check_duplicate first and confirm with the user if a likely match " +
    "already exists.",
  create_note:
    " If `body` contains HTML markup, you must also pass isHtml=true — unlike email " +
    "templates, FUB does not auto-detect HTML in notes.",
  update_note:
    " If `body` contains HTML markup, you must also pass isHtml=true.",
  create_template:
    " `body` is the raw HTML of the email template directly — there is no separate " +
    "isHtml/html flag for templates (unlike notes, which need isHtml=true explicitly).",
  post_templates_merge:
    " This actually SENDS a real email to the listed recipients using the given " +
    "template — despite the generic \"merge\" name, this is not a preview/render-" +
    "only action. Treat it like sending a message on the user's behalf: confirm " +
    "the template, recipients, and merge person with the user before calling.",
  post_text_message_templates_merge:
    " This actually SENDS a real text message to the listed recipients using the " +
    "given template — despite the generic \"merge\" name, this is not a preview-" +
    "only action. Treat it like sending a message on the user's behalf: confirm " +
    "the template and recipients with the user before calling.",
};

/**
 * Tools that aren't DELETEs but still take a hard-to-undo, visible-to-others
 * action (sending real communication, in this case) — same confirm=true
 * discipline as deletes, but not gated behind FUB_MCP_ALLOW_DELETE since
 * they're not destructive to existing data and shouldn't need an extra
 * server-startup opt-in on top of per-call confirmation.
 */
export const sensitiveTools = new Set<string>([
  "post_templates_merge",
  "post_text_message_templates_merge",
]);

/**
 * Deletes whose blast radius extends well beyond the one record being
 * deleted — removing a stage/pipeline/custom field/user/team/pond/group can
 * affect every contact that referenced it, or destroy an entire column's
 * worth of historical data. Layered on top of the generic delete notice.
 */
export const highBlastRadiusDeletes = new Set<string>([
  "delete_custom_field",
  "delete_deal_custom_field",
  "delete_stage",
  "delete_pipeline",
  "delete_user",
  "delete_team",
  "delete_pond",
  "delete_group",
]);

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
