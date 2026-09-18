---
name: create-html-email-template
description: Use when the user wants to create (and optionally share) a Follow Up Boss email template with HTML formatting — buttons, images, colored text, multi-column layouts, or merge fields. Requires the fub-mcp MCP server's create_template tool.
---

# Create an HTML email template in Follow Up Boss

Email templates in FUB take their body as **raw HTML directly** — there is no
separate `isHtml`/`html=true` flag on this endpoint (unlike FUB notes, which do need
`isHtml: true` set explicitly alongside HTML content). Don't add a flag that doesn't
exist here.

## Merge fields — FUB's real syntax is `%merge_field%`

FUB does **not** use `{{curly braces}}` style interpolation — its templates use
`%percent_wrapped_names%`, substituted when a human later actually sends the
template (this tool only saves the template text; nothing sends automatically).
Common ones:

- **Contact**: `%contact_name%`, `%contact_first_name%`, `%contact_last_name%`,
  `%contact_email%`, `%contact_phone%`, `%contact_address%`,
  `%contact_street%`/`%contact_city%`/`%contact_state%`/`%contact_zipcode%`/`%contact_country%`,
  `%contact_rels_first_name%` (first names of linked relationships, e.g. spouse)
- **Company** (Admin > Company settings): `%company_name%`, `%company_phone%`
- **Agent / Lender / Sender** — same fields, swap the prefix (agent = assigned agent,
  lender = assigned lender, sender = whoever is actually sending this message, which
  may be neither): `%agent_name%`, `%agent_first_name%`, `%agent_last_name%`,
  `%agent_email%`, `%agent_phone%` (FUB's built-in calling/texting number),
  `%agent_mobile_phone%` (their real/personal number), `%agent_merge_field_1%` (one
  free-form field each user sets in My Settings, often a booking link).
  **`%*_phone%` vs `%*_mobile_phone%` is genuinely ambiguous — always ask the user
  which one they mean rather than guessing.**
- **Inquiry** (how the contact became a lead): `%inquiry_address%`,
  `%inquiry_address_url%`, `%inquiry_address_preview%` (HTML photo+link box)
- **Recently viewed** (only if synced with a provider that shares views):
  `%viewed_address%`, `%viewed_address_url%`, `%viewed_address_preview%`,
  `%last_5_preview%`
- **Other**: `%source_name%` (lead source, e.g. "Zillow"), `%greeting_time%`
  ("Morning"/"Afternoon"/"Evening" by send time), `%tour_time%` (if scheduled via
  Zillow)
- **Custom fields**: `%custom_<name>%` (e.g. `%custom_birthday%`). Call
  `list_custom_fields` to confirm the field exists — but its API name
  (`customBirthday`, camelCase) and merge-field name (`%custom_birthday%`,
  snake_case) are different spellings of the same field. There's no API that
  returns the merge-field spelling directly; confirm the exact form with the user
  if it's not obvious, or check FUB's own Merge Fields dropdown in the template
  composer.

A merge field with no value for a given contact is just left blank when used — not
an error, not a visible placeholder. Never invent a merge field name; if unsure it
exists, ask or check `list_custom_fields`.

## Procedure

1. Confirm with the user what the email is for and which merge fields they want.
2. Write clean, email-client-safe HTML: prefer table-based layouts and inline styles
   over `<style>` blocks or external CSS — many email clients strip both of those.
   Keep it reasonably simple unless the user explicitly wants a heavily designed
   template.
3. Call `create_template` with:
   - `name` — a short internal name for the template (not shown to recipients)
   - `subject` — the email subject line (merge fields work here too)
   - `body` — the full HTML, as a plain string (no `isHtml` field)
   - `isShared` — `true` if other users on the FUB team should be able to use it,
     `false`/omitted if it's just for the creating user
4. Show the user the final HTML you sent before calling the tool if it's long or
   complex, so they can catch anything they'd want changed before it's saved.
5. After creation, mention the returned template `id` in case they want to reference,
   update, or merge-preview it later.
