---
name: fub-mcp-setup
description: Use when the user wants to install/configure the fub-mcp Follow Up Boss MCP server for their own Claude Desktop or Claude Code, e.g. "set up my FUB MCP tools" or "add the fub-mcp server."
---

# Set up fub-mcp for this user's Claude

**Do not ask the user for their Follow Up Boss API key in this conversation.**
Whatever gets typed into a Claude chat is transmitted and stored as ordinary
conversation content — on consumer accounts, "Help improve Claude" defaults to *on*,
meaning that message (key included) could be retained up to 5 years and used as
training data unless the user has turned it off. A live CRM credential should never
pass through that path, and it doesn't need to: `fub-mcp` ships its own native,
local credential entry that never touches any LLM context at all.

## Procedure

1. **Check the platform.** The guided setup below currently only supports macOS
   (native `osascript` popup). If the user is on Windows or Linux, skip to
   "Manual setup" below instead.

2. **Tell the user to run one command themselves**, in their own Terminal:
   ```
   npx -y fub-mcp setup
   ```
   Explain what it does before they run it: a native macOS dialog will appear
   asking for their FUB API key (masked input, like a password field); it validates
   the key against the live API; it saves the key to `~/.fub-mcp/.env` (readable
   only by their own user account); and it automatically adds the (secret-free)
   `fub-mcp` entry to their Claude Desktop config. **You cannot run this command on
   their behalf** — it opens a GUI dialog on their physical screen, which only works
   when a human runs it locally, not from an agent's own remote/sandboxed shell.

3. **Tell them to fully restart Claude Desktop** (quit and reopen, not just close
   the window) once the popup confirms success.

4. **Verify**: ask them to check Settings for `fub-mcp` showing as connected, or
   just try asking a FUB-related question in a new conversation.

5. Mention the two skills that ship alongside the server
   (`skills/query-smart-list`, `skills/create-html-email-template` in the fub-mcp
   repo) as optional follow-up installs — this skill only covers server setup.

## Manual setup (Windows/Linux, or if the guided setup fails)

If you do end up needing to edit `claude_desktop_config.json` directly because the
guided setup isn't available on their platform: still don't ask for the key in
chat. Instead, write the config entry with an **empty placeholder** for
`FUB_API_KEY` and tell the user to open the file themselves in a text editor and
paste their real key into that one field directly — you show them exactly where,
but you never see the value.

```json
{
  "mcpServers": {
    "fub-mcp": {
      "command": "npx",
      "args": ["-y", "fub-mcp"],
      "env": { "FUB_API_KEY": "" }
    }
  }
}
```

Always read the existing config file first and merge in — never overwrite the whole
file, since it may already list other MCP servers the user depends on. Never add an
entry with `FUB_MCP_ALLOW_DELETE` set unless the user has separately, explicitly
asked for delete tools to be enabled.
