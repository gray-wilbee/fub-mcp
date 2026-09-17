# fub-mcp

A comprehensive [Model Context Protocol](https://modelcontextprotocol.io) server for
the [Follow Up Boss](https://www.followupboss.com/) real estate CRM API. Not
affiliated with or endorsed by Follow Up Boss.

Generates one MCP tool per FUB API operation (~130+ tools) directly from FUB's
published OpenAPI spec, plus a small set of hand-written extras for behavior that's
real but undocumented. Runs entirely on your machine — your API key never leaves it.

## Install

Add to your MCP client's config (e.g. Claude Desktop's
`claude_desktop_config.json`, or Claude Code's MCP settings):

```json
{
  "mcpServers": {
    "fub-mcp": {
      "command": "npx",
      "args": ["-y", "fub-mcp"],
      "env": {
        "FUB_API_KEY": "your-fub-api-key"
      }
    }
  }
}
```

Get your API key from Follow Up Boss: **Admin → API**.

If you use Claude Desktop or Claude Code, the [`claude-setup`](./claude-setup)
skill will do this file edit for you — see that folder's `SKILL.md`.

### Optional environment variables

| Variable | Default | Purpose |
|---|---|---|
| `FUB_MCP_SYSTEM_NAME` | `fub-mcp` | Sent as `X-System` so FUB attributes actions to this tool and grants the better registered-system rate limit. |
| `FUB_MCP_SYSTEM_KEY` | unset | Only needed if you've separately [registered your own system](https://followupboss.com/2/api). |
| `FUB_MCP_ALLOW_DELETE` | `0` | Set to `1` to enable DELETE-verb tools at all. See **Delete safety** below. |

## Delete safety

Follow Up Boss DELETE calls are permanent. This server treats them as opt-in at two
layers:

1. **Server-level opt-in**: unless `FUB_MCP_ALLOW_DELETE=1` is set in the server's
   environment, delete tools aren't registered at all — the model never sees them as
   callable.
2. **Per-call confirmation**: even with that flag set, every delete tool requires a
   `confirm: true` argument, and its description instructs the model to get explicit,
   specific confirmation from the user before calling it — not to infer consent from
   general intent.

Neither layer trusts the model alone; both must be satisfied.

## What's generated vs. hand-written

Most tools (`list_people`, `create_note`, `update_deal`, ...) are generated at build
time straight from FUB's OpenAPI spec (vendored in `src/openapi/fub-openapi.json` —
refresh it from https://docs.followupboss.com/openapi to pick up FUB API changes).

A few things needed hand-written overrides in `src/overrides/`:

- **`list_notes`** — FUB's docs only document `GET /notes/{id}`, but the plural
  `GET /notes` endpoint works today and supports a `personId` filter. Confirmed
  against the live API; treated as best-effort since it's unofficial.
- **`update_person` tag handling** — adding tags should pass `mergeTags=true`
  (defaulted for you); removing a tag has no dedicated endpoint and requires a
  fetch → filter → PUT-the-whole-array-back pattern (documented in the tool
  description).
- **Notes vs. templates HTML handling** — notes need `isHtml: true` set explicitly
  for HTML bodies; email templates take raw HTML directly with no such flag. These
  are easy to mix up, so both tools' descriptions call it out.
- Two spec quirks fixed transparently by the generator: a couple of endpoints use
  `:id` instead of `{id}` for path params, and the rate-limit endpoints' documented
  paths double up the `/v1` prefix that's already in the base URL.

## Skills

Two [Claude Skills](./skills) ship alongside the server for common multi-step
workflows the tools alone don't capture:

- **`query-smart-list`** — resolve a Smart List by name (not just ID) before filtering
  people by it.
- **`create-html-email-template`** — build and upload an HTML email template
  correctly (see the HTML-handling gotcha above).

## Using this outside Claude

- **ChatGPT Custom GPT**: see [`gpt/`](./gpt) for a trimmed, ≤30-operation OpenAPI
  schema and setup instructions — each person builds their own GPT with their own
  API key, no shared/hosted backend involved.
- **Claude web or mobile without the desktop app**: not currently supported.
  Claude.ai's custom-connector UI only supports OAuth (or an org-admin-only static
  header beta) for remote connectors, so there's no individual, bring-your-own-key
  path there today the way there is for a Custom GPT. Reaching pure web/mobile users
  would require a hosted, multi-tenant OAuth backend — out of scope for this repo for
  now.

## Development

```bash
npm install
npm run build
npm run inspect   # opens the MCP Inspector against the built server
```

`src/openapi/generate-tools.ts` does the spec → tool-schema conversion;
`src/overrides/index.ts` is where undocumented endpoints, description corrections,
and default overrides live. `src/tools.ts` merges the two and applies delete-gating.

## License

MIT
