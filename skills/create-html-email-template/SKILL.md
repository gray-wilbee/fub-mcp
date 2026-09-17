---
name: create-html-email-template
description: Use when the user wants to create (and optionally share) a Follow Up Boss email template with HTML formatting — buttons, images, colored text, multi-column layouts. Requires the fub-mcp MCP server's create_template tool.
---

# Create an HTML email template in Follow Up Boss

Email templates in FUB take their body as **raw HTML directly** — there is no
separate `isHtml`/`html=true` flag on this endpoint (unlike FUB notes, which do need
`isHtml: true` set explicitly alongside HTML content). Don't add a flag that doesn't
exist here.

## Procedure

1. Confirm with the user what the email is for and any merge fields they want (FUB
   supports `{{firstName}}` style interpolation in template bodies — mirror whatever
   placeholder syntax they're already using elsewhere in their FUB templates if they
   show you an example).
2. Write clean, email-client-safe HTML: prefer table-based layouts and inline styles
   over `<style>` blocks or external CSS — many email clients strip both of those.
   Keep it reasonably simple unless the user explicitly wants a heavily designed
   template.
3. Call `create_template` with:
   - `name` — a short internal name for the template (not shown to recipients)
   - `subject` — the email subject line
   - `body` — the full HTML, as a plain string (no `isHtml` field)
   - `isShared` — `true` if other users on the FUB team should be able to use it,
     `false`/omitted if it's just for the creating user
4. Show the user the final HTML you sent before calling the tool if it's long or
   complex, so they can catch anything they'd want changed before it's saved.
5. After creation, mention the returned template `id` in case they want to reference,
   update, or merge-preview it later.
