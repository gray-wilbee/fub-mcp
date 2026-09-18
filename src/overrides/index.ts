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
 * FUB's %merge_field% syntax for email/text templates — verified against
 * https://docs.followupboss.com/reference/merge-fields plus FUB's help
 * center (Custom Merge Fields, How to Use Merge Fields, Calling and
 * Texting Compliance, Carrier Filtering), and Will's own field notes from
 * using the product day to day. Shared between create_template and
 * create_text_message_template since the field syntax itself doesn't
 * differ by channel — only which categories make sense to use where.
 */
const MERGE_FIELDS_GUIDE =
  " FUB templates support %merge_field% placeholders that FUB substitutes when a " +
  "human actually sends the template (not by this tool — this just saves the " +
  "template text as-is). Reference:\n" +
  "Contact: %contact_name% (full), %contact_first_name%, %contact_last_name%, " +
  "%contact_email%, %contact_phone%, %contact_address%, %contact_street%, " +
  "%contact_city%, %contact_state%, %contact_zipcode%, %contact_country%, " +
  "%contact_rels_first_name% (first names of the contact's linked relationships, " +
  "e.g. spouse/family added via peopleRelationships).\n" +
  "Company (from Admin > Company settings): %company_name%, %company_phone%.\n" +
  "Agent / Lender / Sender — same field set, swap the prefix (agent = assigned " +
  "agent, lender = assigned lender, sender = whoever is actually sending this " +
  "particular message, which may be neither): %agent_name%, %agent_first_name%, " +
  "%agent_last_name%, %agent_email%, %agent_phone% (the FUB-assigned " +
  "calling/texting number), %agent_mobile_phone% (their real/personal number), " +
  "%agent_merge_field_1% (one free-form field each user sets in My Settings > " +
  "Other Settings > Edit User Merge Field — commonly a booking link or social " +
  "profile). ⚠️ %*_phone% vs %*_mobile_phone% is genuinely ambiguous — always " +
  "confirm with the user which one they mean before using either; picking wrong " +
  "sends the recipient the wrong callback number.\n" +
  "Inquiry (how the contact became a lead, e.g. clicking \"Get more info\" on a " +
  "listing site): %inquiry_address%, %inquiry_address_url% (only if the lead " +
  "source provided one), %inquiry_address_preview% (renders an HTML photo+link " +
  "box — email only, meaningless in a plain-text SMS template).\n" +
  "Recently viewed (populated only when synced with a provider that shares " +
  "property views): %viewed_address%, %viewed_address_url%, " +
  "%viewed_address_preview%, %last_5_preview% (up to 5 as HTML boxes, email only).\n" +
  "Other: %source_name% (lead source, e.g. \"Zillow\" — \"I saw your inquiry on " +
  "%source_name%\"), %greeting_time% (\"Morning\"/\"Afternoon\"/\"Evening\" based " +
  "on send time — \"Good %greeting_time%, %contact_first_name%\"), %tour_time% " +
  "(populated if the contact scheduled a tour via Zillow).\n" +
  "Custom fields: %custom_<name>% (e.g. %custom_website%, %custom_birthday%, " +
  "%custom_spouse_name%). Call list_custom_fields to confirm a field exists — but " +
  "note its API name (e.g. customBirthday, camelCase) and its merge-field name " +
  "(%custom_birthday%, snake_case) are different spellings of the same field, and " +
  "there's no API that returns the merge-field spelling directly, so confirm the " +
  "exact form with the user (or FUB's own Merge Fields dropdown in the template " +
  "composer) if it's not obvious from the label.\n" +
  "A merge field with no value for a given contact is simply left blank when the " +
  "template is used — not an error, not a visible placeholder.";

const TEXTING_COMPLIANCE_NOTE =
  " Texting-specific, per FUB's own Compliance/Carrier Filtering guidance: " +
  "initial/first-outreach text templates should include opt-out language " +
  "(\"Reply STOP to unsubscribe\") and introduce the sender/company by name. " +
  "Avoid designing a template purely for identical mass-blasting — carriers " +
  "filter messages that look like spam, personalization (via merge fields) " +
  "reduces that risk. If the template includes a URL, use the full URL rather " +
  "than a shortened link, since shorteners are more likely to get carrier-filtered.";

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
    "isHtml/html flag for templates (unlike notes, which need isHtml=true explicitly)." +
    MERGE_FIELDS_GUIDE,
  update_template: MERGE_FIELDS_GUIDE,
  create_text_message_template: MERGE_FIELDS_GUIDE + TEXTING_COMPLIANCE_NOTE,
  update_text_message_template: MERGE_FIELDS_GUIDE + TEXTING_COMPLIANCE_NOTE,
  post_templates_merge:
    " Despite the name, this almost certainly does NOT send anything — inferred " +
    "from its identical-shaped sibling post_text_message_templates_merge, which was " +
    "verified live 2026-09 (firing it at a real phone number produced no delivery " +
    "and no new record in list_text_messages, only a rendered string back); the " +
    "email variant itself wasn't separately fired to avoid sending an unwanted " +
    "email. It's a preview/render utility for the edge case of one message " +
    "greeting multiple recipients at once (e.g. \"Hey Bob, Alice and Carol...\") — " +
    "useful for composing that combined greeting, not for actually delivering it.",
  post_text_message_templates_merge:
    " Despite the name, this does NOT send anything — verified live 2026-09: firing " +
    "this at a real phone number produced no delivery and no new record in " +
    "list_text_messages, only a rendered string back ({\"mergedTemplate\": \"...\"}). " +
    "It's a preview/render utility for the edge case of one text greeting multiple " +
    "recipients at once (e.g. \"Hey Bob, Alice and Carol...\"), not an actual send.",
};

/**
 * Tools that aren't DELETEs but still take a hard-to-undo, visible-to-others
 * action (e.g. actually sending real communication) — same confirm=true
 * discipline as deletes via ToolDef.requiresConfirm, but not gated behind
 * FUB_MCP_ALLOW_DELETE. Currently empty: post_templates_merge and
 * post_text_message_templates_merge were the only candidates, and testing
 * live against a real phone number (2026-09) showed neither one actually
 * sends anything — see their descriptionAppendix entries above. Kept as an
 * explicit mechanism rather than removed, since a genuinely sensitive
 * non-delete action would be easy to miss without one.
 */
export const sensitiveTools = new Set<string>([]);

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
