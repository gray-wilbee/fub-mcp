# Installation: local and always-on clients

These instructions describe version 0.3.0. Platform documentation was checked on
2026-10-23; named cloud connections were not exercised during this release work.

## Understand the connection

| Model | Where the process and key live | Current status |
|---|---|---|
| Desktop/CLI stdio | On the machine running the MCP client | Implemented; client starts the child process |
| Always-on stdio | On a private VM running both the agent and this process | Same transport; requires an agent that supports spawning stdio children |
| Remote HTTPS MCP | On a server, with client-facing authentication | Not implemented; no HTTP listener, OAuth server, or remote bearer-token verifier |
| Custom GPT Actions | Key stored in the GPT configuration; OpenAI calls FUB directly | Separate OpenAPI integration under `gpt/`, not this MCP process |

A background `node dist/index.js` process on its own is not a remote endpoint.
Neither a reverse proxy nor a firewall converts stdio into HTTP. Do not expose an
anonymous bridge carrying an owner's CRM key.

## Source installation for a stdio host

Use Git and a supported Node.js LTS runtime; Node 24 is the baseline for new installs.
The reviewed build was tested with Node 26.7.0, not a full supported-runtime matrix.
Supported runtime lines are Node 22.16+, 24 and 26.

1. Clone the repository and choose a maintainer-reviewed immutable release tag or
   commit. Replace REVIEWED_REF below with the immutable commit/tag of the release you
   reviewed. Do not install an unmerged candidate as a stable release:

   ```sh
   git clone https://github.com/gray-wilbee/fub-mcp.git
   cd fub-mcp
   git checkout --detach REVIEWED_REF
   npm ci --ignore-scripts
   npm run build
   ```

2. Configure your host to launch the built entry point. For hosts using an
   `mcpServers` JSON structure, adapt the paths:

   ```json
   {
     "mcpServers": {
       "fub-mcp": {
         "command": "/absolute/path/to/node",
         "args": ["/absolute/path/to/fub-mcp/dist/index.js"],
         "env": {"FUB_MCP_ALLOW_WRITE": "0"}
       }
     }
   }
   ```

   Windows paths must be JSON escaped (for example `C:\\...\\node.exe`). Other
   clients use different schemas; do not paste this into an undocumented settings UI.

3. Supply `FUB_API_KEY` using the host's protected secret settings/environment
   injection. Check that the child receives the variable without displaying its
   value. Do not insert keys into a CLI argument, repository, prompt, or screenshot.
   GUI apps may not inherit terminal environment variables. If your host stores
   secrets in its JSON configuration, treat that file as plaintext credentials,
   restrict its permissions/ACL, and exclude it from sync and backups as appropriate.

4. Start/restart the host and verify tools are listed. Version 0.3.0 lists 70 GET
   tools by default. Start with a small read explicitly
   authorized by the account owner. `npm test` runs offline mocks; the legacy
   `smoke-test.mjs` refuses to perform live requests.

5. Review host logs for failures without copying CRM data or credentials into issues.
   Missing key errors usually mean the child did not receive the environment.
   Missing command errors usually mean the host cannot resolve Node or the script.

Pin releases and review changes before updates. Avoid an unversioned `npx -y`
command that fetches new code while inheriting CRM secrets. For the desktop bundle,
use a specific release artifact and verify published hashes when available. The
maintainer should publish those hashes; this review did not verify downloaded assets.

## Access modes

| What you want | Claude Desktop setting | Environment settings |
|---|---|---|
| View information | Leave **View and update records** off | `FUB_MCP_ALLOW_WRITE=0` (default) |
| View and update records | Turn **View and update records** on | `FUB_MCP_ALLOW_WRITE=1` |
| Also allow permanent deletes | Enable updates and **Advanced: allow permanent deletes** | Above plus `FUB_MCP_ALLOW_DELETE=1` |
| Also manage webhooks | Enable updates and **Advanced: manage webhooks**, then enter approved hosts | Above plus `FUB_MCP_ALLOW_WEBHOOKS=1` and `FUB_MCP_WEBHOOK_HOSTS=hooks.example.com` |
| Also trigger workflows directly | Enable updates and **Advanced: trigger workflows directly** | Above plus `FUB_MCP_ALLOW_AUTOMATIONS=1` |

Restart the server/extension and open a new chat after changing settings. In JSON,
use string values such as `"FUB_MCP_ALLOW_WRITE": "1"`; extension boolean settings
also produce supported `true`/`false` strings. Invalid flags stop startup rather
than silently enabling access. Turning updates off blocks all non-GET calls even
if advanced switches remain on. No API-key change is needed to switch modes.

Ordinary update mode exposes 126 tools; all opt-ins expose 157. All non-GET calls
also require boolean `confirm: true`. This is a caller assertion, not proof of a
human decision. Use the host's independent approvals. The conservative viewing mode
blocks POST preview utilities too. The workflow switch covers direct `/events`,
`/actionPlansPeople` and `/automationsPeople` writes. Ordinary updates may activate
existing business rules in FUB; do not promise that they have no side effects.

Webhook hostnames must be exact (comma-separated if needed), without wildcards.
New/changed destinations must be HTTPS on port 443, with no embedded credentials,
IP address (including IPv6), trailing-dot hostname or fragment. Host restrictions
do not audit existing webhook URLs;
review existing subscriptions before granting webhook administration.

## Configuration and secret precedence

`FUB_API_KEY` in the process environment wins over the fallback file
`~/.fub-mcp/.env`. A project-root `.env` is **not** automatically loaded, so copying
`.env.example` to the checkout alone does not configure the server. Only the API key
is read from the fallback file. The system name, system key, access flags and webhook host list must be
process environment variables. `FUB_MCP_SYSTEM_KEY` is ignored unless a nonblank
`FUB_MCP_SYSTEM_NAME` is also provided.

The optional macOS `setup --local` command performs a live `/me` validation,
writes the fallback key file, and edits Claude Desktop's configuration. It is not
an offline test or a headless Linux installer. See [key security](SECURITY-GUIDE.md).

## Platform status

These are documentation-based assessments, not tested certifications:

| Product | Verified platform capability | Status for this repository |
|---|---|---|
| Claude Desktop | Existing `.mcpb`/stdio implementation in this repo; maintainer reports Mac/Windows tests | Local route documented; no fresh GUI test in this review |
| OpenAI Dot | [Installed account plugins](https://learn.chatgpt.com/docs/dots/computers-and-apps); [general remote MCP guide](https://developers.openai.com/api/docs/guides/custom-mcp-server) | Dot-specific custom installation remains conditional on connector availability and testing; Codex local stdio settings do not establish Dot support |
| Grok Bot | [Command MCP and Remote HTTPS](https://docs.x.ai/grok-bot/team-bots) | Command mode is a possible stdio route, not tested here; remote mode needs new server/auth code |
| Muse | [Custom API connectors and Secure Credentials Store](https://www.meta.com/help/superintelligence/1687253048996149/) | MCP transport and exact installation path unverified; no promised MCP setup |
| Claude Duet | [Inherited connectors and limitations](https://support.claude.com/en/articles/17631495-get-started-with-claude-duet) | No verified arbitrary local stdio path; [general remote connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) do not prove Duet compatibility |

For Grok Team Bots, credential-bearing Command tools are restricted to the owner's
chat; a keyed remote connector uses the bot credential for everyone, while individual
OAuth can provide teammate identities. Personal Bots can share a computer, files and
CLI credentials, and installed packages may be replaced. Private chats do not provide
OS isolation. Review [computer and apps behavior](https://docs.x.ai/grok-bot/computer-and-apps).
Use a personal isolated deployment first. Do not promise team safety until there is
real caller-to-credential authorization and tenant isolation.
