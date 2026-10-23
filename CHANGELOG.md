# Changelog

## 0.3.0 — security hardening (release candidate)

### Migration from 0.2.x

- **Default behavior changes:** viewing only. To restore ordinary create/update
  operations, enable **View and update records** in the extension, or set
  `FUB_MCP_ALLOW_WRITE=1` in the server's environment and restart it.
- Writes are still available; this is an enforced operating mode, not a permanent
  removal. Returning the setting to off/0 blocks writes again.
- Deletes additionally require `FUB_MCP_ALLOW_DELETE=1`. Existing delete opt-ins
  alone do not enable writes after upgrading.
- Webhook changes additionally require `FUB_MCP_ALLOW_WEBHOOKS=1`; new/changed URLs
  must match an exact hostname in `FUB_MCP_WEBHOOK_HOSTS` and use HTTPS/443.
- Lead events, Action Plans and direct Automation operations additionally require
  `FUB_MCP_ALLOW_AUTOMATIONS=1`. Other record changes may still trigger FUB rules.
- All non-GET calls require boolean `confirm: true`. Clients should seek independent
  user approval; the server cannot prove who supplied that flag.
- Node 18/20 are no longer supported. Use Node 22.16+, 24 or 26. Check the bundled
  runtime in desktop hosts before upgrading.
- Tool arguments are now validated. Unknown fields, unsafe IDs, extra-field
  collisions and oversized inputs fail locally. Put declared fields at the top
  level. Extras support scalar custom fields and positive-ID collaborator arrays.
- Redirects are rejected; response size, concurrency and request duration are bounded.
  Writes are never automatically retried, including on 429. Inspect uncertain writes
  before trying again. Upstream error bodies are omitted from tool errors.
- Updated pinned SDK and dependency lock. The desktop bundle is built with Python's
  standard ZIP library and includes the root license, documentation and third-party
  dependency notices. No mutable packer is downloaded by the build script.
- Replaced the live-data smoke test with offline regression tests and added release checks. This version does not add HTTP hosting or change installed keys.
