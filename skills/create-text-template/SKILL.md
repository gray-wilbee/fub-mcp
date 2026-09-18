---
name: create-text-template
description: Use when the user wants to create a Follow Up Boss SMS/text message template, including ones with merge fields. Requires the fub-mcp MCP server's create_text_message_template tool.
---

# Create a text message template in Follow Up Boss

Text templates are **plain text only** — `message` has no HTML concept at all,
unlike email templates. Don't add markup.

## Merge fields — same `%merge_field%` syntax as email templates

See the `create-html-email-template` skill for the full reference (Contact, Company,
Agent/Lender/Sender, Inquiry, Recently Viewed, Other, Custom). The most commonly
useful ones for a short text are `%contact_first_name%`, `%agent_first_name%`,
`%greeting_time%`, and `%source_name%`. As with email: confirm which of
`%agent_phone%` (FUB number) vs `%agent_mobile_phone%` (real number) the user wants
before using either — never guess.

## Compliance — this is more load-bearing for texts than for email

Per FUB's own Texting Compliance and Carrier Filtering guidance:

- **First-contact/initial-outreach templates should include opt-out language**
  (e.g. "Reply STOP to unsubscribe") — bring this up proactively if the user is
  building a template meant for first outreach to new leads, don't wait to be asked.
- **Introduce the sender/company by name** in a first-contact text — recipients who
  don't recognize the number are more likely to report it as spam.
- **Personalize rather than design for identical mass-blasting.** Carriers
  (Verizon, AT&T, T-Mobile, etc.) run spam/content filtering and are more likely to
  silently block a message that looks like it was sent unchanged to many people at
  once — merge fields help here since they naturally vary the text per recipient.
- **Use full URLs, not shortened links.** Link shorteners are more likely to trigger
  carrier filtering since the carrier can't tell what business the link points to.

## Procedure

1. Ask what the text is for and, if it sounds like first-contact/cold outreach,
   proactively raise the opt-out-language point above rather than waiting to be asked.
2. Write the message: short, personalized via merge fields where natural, full URLs
   if any link is included, plain text (no markdown/HTML).
3. Call `create_text_message_template` with:
   - `name` — internal name, not shown to recipients
   - `message` — the plain-text body
   - `isShared` — `true` to share with the rest of the FUB team, omitted/false for
     personal use only
4. Show the user the final text before calling the tool so they can adjust tone/length
   — text templates are read in full in a notification preview, unlike email.
