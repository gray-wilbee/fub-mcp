# A private, always-on FUB agent on a DigitalOcean Droplet

This is a planning and installation guide, not a deployed service. Current
`fub-mcp` provides stdio only. You can put **an agent that launches stdio tools and
this server together** on a Droplet. This does not create an MCP URL for Dot,
Grok Bot, Muse or Claude Duet to connect to. Their compatibility must be verified
separately; see [installation](INSTALLATION.md).

## Choose a small machine

Use a supported Ubuntu 24.04 image and a Basic Regular Droplet. As checked on
2026-10-23, 2 GiB RAM / 1 vCPU / 50 GiB disk is $12/month; 1 GiB / 25 GiB is $6/month.
Start with 2 GiB for a lightweight API-backed agent and test peak memory during
builds, updates and concurrent jobs. A browser-heavy agent or local model needs a
separate sizing exercise. A 1 GiB instance is conditional on measurement, not a
promised minimum. [Droplet prices](https://www.digitalocean.com/pricing/droplets).

Weekly backups add 20%, daily backups 30%; protect snapshots because they may contain
credentials and CRM data. Taxes, domains, agent/API subscriptions and overages are
additional. [Backup pricing](https://docs.digitalocean.com/products/backups/details/pricing/).
Free MIT source code does not make FUB accounts, hosting or model usage free.

## Provision and restrict access

These are actions for the owner to perform after choosing an agent; nothing here
has been provisioned or tested on a live Droplet.

1. Create the Droplet in an appropriate region with your SSH **public** key. Keep
   the private SSH key on your own device. Use an account recovery method and MFA
   appropriate to your DigitalOcean account.
2. Create a non-root administrator for maintenance, and a separate no-sudo runtime
   identity such as `fub-agent`. Give the runtime only the files it needs.
3. Allow inbound SSH (22) only from the administrator's IP or a private administration
   network. For the current stdio model, do not open an MCP port, 80 or 443.
   Outbound HTTPS must reach FUB and the chosen agent/model provider; updates also
   need package sources. Keep DNS and time synchronization working.
4. Apply OS security updates and plan reboots. Maintain secure SSH recovery access
   while tightening settings; do not blindly disable your only access path.

## Install the program without runtime secrets

Install Git and a supported Node LTS runtime from reviewed official distribution
instructions; verify the Node distribution signature/checksum. Node 24 is the guide
baseline, although this review's offline tests used Node 26.7.0. Do not pipe an
unreviewed web installation script into a privileged shell.

As a build/maintenance user, follow [source installation](INSTALLATION.md#source-installation-for-a-stdio-host)
and use a reviewed immutable commit, `npm ci --ignore-scripts`, then `npm run build`.
Keep FUB credentials absent during dependency installation and compilation. Install
the tested runtime files in a versioned directory such as `/opt/fub-mcp/releases/VERSION`
and select one with `/opt/fub-mcp/current`. Code should be owned by the administrator
and readable, but not writable, by `fub-agent`. Retain a previous known-good release
for rollback. Verify Node and `dist/index.js` paths before configuring the agent.

Configure the chosen agent's **stdio client** to launch:

```text
command: /absolute/path/to/node
arguments: /opt/fub-mcp/current/dist/index.js
```

This is a description of two configuration fields, not a shell command. The agent
owns stdin/stdout and starts/restarts the child. No client has been selected in this
guide, so there is deliberately no fabricated agent command or runnable systemd
unit. A unit whose only ExecStart is `node dist/index.js` will not supply an agent
or a remote MCP endpoint.

## Provide credentials and supervise the agent

Use a secret manager if the agent can inject secrets directly into the MCP child.
As a baseline for a system service, an administrator can create a root-owned 0600
file such as `/etc/fub-agent/runtime.env` in a 0700 directory, enter the values in a
trusted private editor, and configure systemd `EnvironmentFile=` on the **agent's**
service. File contents have the form below; the words in angle brackets are
placeholders, never real keys in documentation:

```text
FUB_API_KEY=<enter privately>
FUB_MCP_ALLOW_WRITE=0
FUB_MCP_ALLOW_DELETE=0
FUB_MCP_SYSTEM_NAME=<registered identifier, if applicable>
FUB_MCP_SYSTEM_KEY=<enter privately, if applicable>
```

Omit both optional registration lines if unused. The agent must explicitly pass the
necessary variables to its child. The root system manager can read the file before
starting the unprivileged service. It is still plaintext, and inherited environment
variables may be available to other subprocesses of the agent; child-specific
secret injection is preferable. This repo has no native `*_FILE` setting or systemd
credential reader. Do not put values in unit files, arguments or shell history.

Once the actual agent entry point is known, review a systemd unit using `User=fub-agent`,
`UMask=0077`, `Restart=on-failure`, `NoNewPrivileges=true`, `PrivateTmp=true`,
`ProtectSystem=strict`, and only necessary writable state directories. Evaluate
`ProtectHome` and resource limits against the agent's real needs. Never give a broad
shell/browser agent unrestricted access to unrelated credentials. Verify restart,
child cleanup, signal handling and permissions in staging before enabling on boot.
See [systemd execution settings](https://www.freedesktop.org/software/systemd/man/258/systemd.exec.html).

## Test and operate

Use synthetic keys and mocked FUB responses first. Verify initialization, tool
listing, allowed calls, denied calls, cancellation and restart. Check that logs do
not contain headers, keys or CRM bodies. Use `npm test`; the legacy smoke script
refuses live access.
Before using real data, confirm the FUB identity and explicit intended permissions.
A successful read does not demonstrate write safety. Version 0.3.0 enforces viewing
only by default. Keep `FUB_MCP_ALLOW_WRITE=0` until the owner explicitly chooses
updates; advanced actions require separate switches. These MCP controls do not
constrain an agent's independent shell access to credentials.

Monitor failures, memory and rate-limit responses without collecting CRM payloads.
Use bounded concurrency. Do not automatically rerun an uncertain write: determine
whether it succeeded first. Rotate/revoke credentials on exposure, restart after
rotation, and test restoration of code and configuration from protected backups.
Review dependency and OS updates before promoting a new pinned version.

## Remote HTTPS MCP is future work

A remote service needs a separately reviewed implementation before opening a port:

- A supported MCP HTTP transport and client/protocol compatibility tests. Refresh
  the locked SDK and evaluate all relevant advisories, including optional validation
  limits. The current dependency lock uses SDK 1.32.1. Its optional HTTP validation
  settings still need deliberate configuration; stdio tests do not prove HTTP safety.
- TLS, origin/host validation where applicable, input/body/batch limits, connection
  limits, timeouts and cancellation. A proxy alone is insufficient.
- Authentication before MCP processing, token issuer/audience/expiry checks,
  correct OAuth flows for clients that require OAuth, and per-tool authorization.
  Keep client-facing credentials separate from upstream FUB keys; no token passthrough.
- Isolation of caller identities, credentials, sessions and responses. Start with
  one private user. Shared owner credentials behind a login are not multi-tenancy.
- Enforced write policy and independent approvals for sensitive actions, including
  webhook destinations and automation/lead-triggering side effects.
- Tests for missing/expired/wrong-audience tokens, unauthorized direct `tools/call`,
  cross-user access, prompt injection, redirects, log redaction and retry duplicates.

Only then consider inbound 443, a loopback-bound application port, and a reverse
proxy such as [Caddy](https://caddyserver.com/docs/quick-starts/reverse-proxy).
Port 80 is needed only if the selected certificate-validation/redirect setup needs
it. Caddy does not turn stdio into MCP HTTP or authorize CRM tools.
Use the [MCP authorization specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)
and [security practices](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices)
that match the final SDK/client versions. No anonymous stdio-to-SSE bridge is
recommended here.
