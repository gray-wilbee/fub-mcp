# fub-mcp

A comprehensive [Model Context Protocol](https://modelcontextprotocol.io) server for
the [Follow Up Boss](https://www.followupboss.com/) real estate CRM API. Not
affiliated with or endorsed by Follow Up Boss.

Generates one MCP tool per FUB API operation (~130+ tools) directly from FUB's
published OpenAPI spec, plus a small set of hand-written extras for behavior that's
real but undocumented. Runs entirely on your machine — your API key never leaves it.

## Install

### Claude Desktop (recommended — no Terminal, no Node.js)

1. **Download** [`fub-mcp.mcpb`](https://github.com/gray-wilbee/fub-mcp/releases/latest/download/fub-mcp.mcpb)
   (it lands in your Downloads folder).
2. **Install it from inside Claude Desktop:** open **Settings → Extensions →
   Advanced settings → Install Extension…** and choose the downloaded file. (Dragging
   the file onto the Claude Desktop window also works. On macOS, double-clicking works
   too, but **on Windows double-clicking does not** — Claude Desktop doesn't register
   the file type, so Windows offers Notepad instead. Cancel that prompt and use the
   in-app route.)
3. **Paste your Follow Up Boss API key** into the masked field (FUB → Admin → API),
   then click **Install**. Claude Desktop stores the key in your system keychain
   (macOS Keychain / Windows Credential Manager); it is never typed into a chat and
   never sent anywhere except directly to Follow Up Boss.
4. **Turn it on.** Installing does not enable it: go to **Settings → Extensions**,
   find **Follow Up Boss**, and switch the toggle **on**.
5. **Start a new chat** and try *"List my 3 most recently added contacts."*

Claude Desktop ships its own Node.js runtime, so nothing else needs installing. Notes:
the bundle isn't code-signed yet, so Claude Desktop may show an unverified-developer
caution. It is pure JavaScript (no native binaries), tested end to end on macOS;
Windows is being verified. To update, download the newest `.mcpb` and install it over
the old one.

### Claude Code, other MCP clients, or Terminal users

```bash
claude mcp add fub-mcp --env FUB_API_KEY=your-key -- npx -y fub-mcp
```

or add this to your MCP client's config (e.g. `claude_desktop_config.json`):

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

Requires Node.js 18+. Get your API key from Follow Up Boss: **Admin → API**.

#### Optional: macOS-only key-entry popup

If you'd rather not put your key in a config file, macOS users can run
`npx -y fub-mcp setup`: a native masked dialog collects the key, validates it against
the live API, saves it to `~/.fub-mcp/.env` (readable only by your user), and adds a
secret-free entry to Claude Desktop's config. Claude Desktop users should prefer the
extension above, which needs no Terminal and stores the key in the OS keychain. This
popup is not available on Windows or Linux (use the extension, or the commands above).

### Recommended for heavy use: register your own FUB system

Follow Up Boss asks API users to register their system, and registered systems get a
higher request rate (FUB's API states this in its responses). By default this tool
identifies itself as an unregistered `fub-mcp`. FUB's terms also say a system key is
private and must not be shared, so a shared one can't ship with this project: each
customer registers their own.

1. Register at <https://apps.followupboss.com/system-registration> (system name, a
   "System ID Header" of your choosing such as `acme-realty-claude`, your name, email,
   and organization). Read the terms linked on that page.
2. FUB provides your **X-System-Key** after you register.
3. In Claude Desktop, open **Settings → Extensions → Follow Up Boss** and fill in the
   two optional fields: **your registered system ID** (the System ID Header) and
   **your system key**. Restart Claude Desktop. (Other clients: set
   `FUB_MCP_SYSTEM_NAME` and `FUB_MCP_SYSTEM_KEY`.)

**Keep the system key private, like your API key.** Paste it only into that masked
field. Never put it in a chat, email, screenshot, or plain-text file; if you need a
copy, use a password manager. The setup instructions tell Claude never to ask for it.
If a key ever lands somewhere it shouldn't, email api@followupboss.com and ask for a
replacement.

### Optional environment variables

| Variable | Default | Purpose |
|---|---|---|
| `FUB_MCP_SYSTEM_NAME` | `fub-mcp` | Sent as `X-System` so FUB attributes actions to this tool and grants the better registered-system rate limit. |
| `FUB_MCP_SYSTEM_KEY` | unset | Only needed if you've separately [registered your own system](https://apps.followupboss.com/system-registration). |
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

Three [Claude Skills](./skills) ship alongside the server for common multi-step
workflows the tools alone don't capture:

- **`query-smart-list`** — resolve a Smart List by name (not just ID) before filtering
  people by it.
- **`create-html-email-template`** — build and upload an HTML email template
  correctly (see the HTML-handling gotcha above), including FUB's `%merge_field%`
  syntax.
- **`create-text-template`** — build an SMS template with the same merge fields, plus
  FUB's own texting-compliance guidance (opt-out language, carrier-filtering
  avoidance).

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
