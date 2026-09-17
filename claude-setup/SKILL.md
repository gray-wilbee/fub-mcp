---
name: fub-mcp-setup
description: Use when the user wants to install/configure the fub-mcp Follow Up Boss MCP server for their own Claude Desktop or Claude Code, e.g. "set up my FUB MCP tools" or "add the fub-mcp server with my API key."
---

# Set up fub-mcp for this user's Claude

This is the closest Claude-native equivalent to a ChatGPT Custom GPT that "just
works" with someone's own credentials: instead of a hosted, no-code connector (which
Claude.ai's individual-user custom-connector UI doesn't support for simple API-key
auth — only OAuth, or an org-admin-only static-header beta), this skill has Claude
itself perform the one-time local setup, using local file access.

**Scope check first:** this only works when running inside Claude Desktop (Chat or
Cowork) or Claude Code, i.e. somewhere with local file access. If the user is on
Claude web or the Claude mobile app with no desktop app installed, say so plainly:
this specific approach can't reach them there, and the only way to get FUB tools into
pure web/mobile today would be a hosted, per-user OAuth backend — a materially bigger
project, not something this skill sets up.

## Procedure

1. **Ask the user for their Follow Up Boss API key** directly in the conversation
   (FUB: Admin → API). Tell them plainly that it will be stored locally in their own
   Claude Desktop config file, in plain text, readable by anything running as their
   own user account — the same way any other local MCP server credential is stored.
   Do not proceed until they've given you the key in this conversation.

2. **Confirm `fub-mcp` is available.** It's designed to run via `npx -y fub-mcp`, so
   no separate install step is required — npm/npx handles fetching it. Just confirm
   Node is available (`node --version`); if not, tell the user to install Node first
   (https://nodejs.org) and stop here.

3. **Locate the Claude Desktop config file:**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

   If it doesn't exist yet, you'll create it. If it does exist, **read it first** —
   never overwrite it wholesale, since it may already list other MCP servers the user
   depends on.

4. **Merge in a `fub-mcp` entry** under `mcpServers`, preserving every other key
   already in the file:
   ```json
   {
     "mcpServers": {
       "...(existing servers, unchanged)...": {},
       "fub-mcp": {
         "command": "npx",
         "args": ["-y", "fub-mcp"],
         "env": {
           "FUB_API_KEY": "<the key the user gave you>"
         }
       }
     }
   }
   ```
   Ask before overwriting if an entry named `fub-mcp` already exists (they may have a
   pinned version or extra env vars set deliberately — e.g. `FUB_MCP_ALLOW_DELETE=1`
   which this setup flow does not enable by default and should not add without the
   user separately asking for it).

5. **Tell the user to fully restart Claude Desktop** (quit and reopen, not just close
   the window) for the new server to load.

6. **Verify**: ask the user to check Settings → Developer (or wherever this Claude
   Desktop build shows MCP server status) for `fub-mcp` showing as running. If you
   have shell access and it's meaningful to do so, you can also sanity-check the
   config file you just wrote is valid JSON.

7. Mention the two skills that ship alongside the server
   (`skills/query-smart-list`, `skills/create-html-email-template` in the fub-mcp
   repo) as follow-up installs if the user wants those workflows too — this skill
   only covers server setup, not those.

## What this does NOT do

- Does not enable delete tools (`FUB_MCP_ALLOW_DELETE` is left unset) unless the user
  explicitly asks for that, separately, understanding what it enables.
- Does not reach Claude web or Claude mobile for a user without the desktop app open.
- Does not touch any other MCP server already configured — always merge, never
  replace the whole `mcpServers` object.
