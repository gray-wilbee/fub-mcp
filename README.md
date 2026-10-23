# fub-mcp

A free, MIT-licensed [Model Context Protocol](https://modelcontextprotocol.io)
server for the [Follow Up Boss](https://www.followupboss.com/) CRM API. Unofficial;
not affiliated with or endorsed by Follow Up Boss. FUB, model and hosting charges
are separate.

**Starts in “View information” mode.** You can look up contacts, notes, tasks,
deals and other information. To create or update records, turn on **“View and update
records.”** Write capabilities remain part of the server; you choose whether to
allow them. Both the tool list and individual calls enforce your selection.

The server uses **stdio**: your MCP client launches it on the same machine. Your
key is sent to FUB over HTTPS, and CRM results pass to your chosen agent/model
provider. This project does not run a hosted backend.

## Install

### Claude Desktop: no Terminal required

1. Download `fub-mcp-VERSION.mcpb` from the chosen
   [GitHub release](https://github.com/gray-wilbee/fub-mcp/releases). Check the
   release version and checksum. Version 0.3.0 is the first release with access modes;
   do not assume an older bundle has them.
2. In Claude Desktop, open **Settings → Extensions → Advanced settings → Install
   Extension…** and choose the file. Use the in-app route; double-click handling
   differs between operating systems.
3. Paste your FUB API key into the masked **Follow Up Boss API Key** field, never
   into chat. Leave **View and update records** off to start with viewing only.
4. Enable the extension under **Settings → Extensions**, then start a new chat.
5. Try an authorized read such as “List my three most recently added contacts.”

The extension marks key fields as sensitive for the host's secret storage. Current
bundles are unsigned; review the source and release before installing. The host must
provide Node 22.16 or later in a supported release line. The 0.3.0 settings changes
still require a fresh Mac/Windows GUI installation check before a stable release;
previous-version GUI tests do not establish compatibility for this version.

### Enable updates when you want them

In **Settings → Extensions → Follow Up Boss**, turn on **View and update records**,
then restart the extension and open a new chat. You can now create and update records,
including notes and tasks. Turn it off and restart to return to viewing only.

For a CLI or JSON-configured host, the single change is:

```json
"FUB_MCP_ALLOW_WRITE": "1"
```

Add it to this server's `env` settings, then restart the host/server. Change it to
`"0"` to return to viewing only. Do not change the API key to switch modes.

**Advanced actions stay off separately:** permanent deletes, webhook management,
and direct workflow triggers require their own opt-ins. Webhooks also need an
approved hostname. See [access modes](docs/INSTALLATION.md#access-modes).
Every non-GET call requires `confirm: true`, but this caller-supplied flag is not proof
of human approval; use your host's independent approval controls. Ordinary record
updates can also activate your existing FUB business rules.

### Other local clients and always-on agents

Follow [installation](docs/INSTALLATION.md) for source builds and secret-free client
configuration. Pin a reviewed revision; avoid fetching mutable code at every launch.
Use a supported Node release (22.16+, 24 or 26; Node 24 is the guide's baseline).

- A desktop/CLI client can launch the stdio process locally.
- An agent you control can run alongside it on a private VM. See the
  [DigitalOcean guide](docs/DIGITALOCEAN.md).
- A cloud product requiring an HTTPS MCP URL needs transport and authentication
  code that this repository **does not provide**. A reverse proxy alone is insufficient.
- See the dated [platform notes](docs/INSTALLATION.md#platform-status) for Dot,
  Grok Bot, Muse and Claude Duet. These are documented capabilities, not tested
  installation claims.
- [Custom GPT Actions](gpt/SETUP.md) are a separate integration. They call FUB directly
  and **do not use this server's access-mode or safety controls**. Keep configured GPTs
  private and assess their permissions separately.

## API key and data security

Use protected client settings or secret injection. Never put a key in chat,
command-line arguments, a repository or an online encoder. A FUB API key inherits
its user's permissions; choose the least-privileged identity that works for the job.
See [security guidance](docs/SECURITY-GUIDE.md).

Process `FUB_API_KEY` takes precedence over `~/.fub-mcp/.env`. A project-root `.env`
is not loaded automatically. The optional macOS `setup --local` command collects a
key in a native dialog, performs a live `/me` check, saves a plaintext file with
POSIX 0600 permissions in a 0700 directory, and configures Claude Desktop. Use the
extension's sensitive field when available. Setup is not an offline test.

Follow [FUB identification requirements](https://docs.followupboss.com/reference/identification),
including registration when providing services to customers. If applicable, set
both `FUB_MCP_SYSTEM_NAME` and `FUB_MCP_SYSTEM_KEY` through protected settings.
A system name alone does not grant registered-system status. Keep system credentials
separate from customer API keys and never distribute either.

## What is included

Tools are generated at startup from the vendored FUB OpenAPI description, with
small overrides for undocumented notes listing and API behavior. In version 0.3.0:

- **70 GET tools** in View information mode.
- **126 tools** with ordinary writes enabled, while advanced opt-ins stay off.
- **157 tools** when all advanced permissions are enabled.

The conservative read mode also blocks POST-based preview/render utilities. Defaults
remain `limit=100` and `mergeTags=true`; pass explicit declared fields to change them.
Extra query/body fields cannot overwrite declared parameters. Extras are limited to
custom fields and `update_person` collaborators; invalid IDs/types/fields fail before
an API request.

Requests reject redirects, have a 30-second total budget, a 2 MiB response limit,
a 256 KiB input limit and at most four active upstream calls. Only GET 429 responses
are retried (at most twice, respecting Retry-After within the budget). Writes are
never automatically retried. Check the record before retrying a timed-out write.

Treat CRM free text, links and HTML as untrusted data, never instructions. These
controls reduce risk; they do not prevent all prompt injection or constrain other
tools an agent can use. An agent with your user's shell access may have access to
credentials outside the MCP protocol.

The [skills](skills) describe smart-list lookup and email/text template creation.
Review those workflows against the access mode you selected.

## Development and releases

```sh
npm ci --ignore-scripts
npm test
npm run check:release
npm pack --dry-run --ignore-scripts
```

Tests use synthetic keys and mocked fetch; no live CRM access. The old live
`smoke-test.mjs` now exits with a pointer to `npm test`. See the
[release checklist and npm handoff](docs/RELEASE.md), [migration notes](CHANGELOG.md)
and [security reporting policy](SECURITY.md).

## License

[MIT](LICENSE). Review upstream API terms and required third-party notices before
redistribution. This project and its security review are not vendor certification.
