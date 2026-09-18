---
name: fub-mcp-setup
description: Use when the user wants to install/configure the fub-mcp Follow Up Boss connector for their own Claude Desktop or Claude Code, e.g. "set up my FUB tools" or "install the Follow Up Boss extension."
---

# Set up fub-mcp for this user's Claude

**Never ask the user for their Follow Up Boss API key in this conversation.**
Anything typed into a Claude chat is transmitted and stored as ordinary conversation
content — on consumer accounts, "Help improve Claude" defaults to *on*, so that
message could be retained for years and used for training. A live CRM credential must
not pass through that path, and it doesn't need to: the extension collects the key in
Claude Desktop's own masked field and stores it in the OS keychain.

You cannot install this for the user (you can't click their installer or open their
settings). Your job is to **walk them through it, one step at a time, and wait for
them to confirm each step before giving the next.** Assume they are not technical.

## Claude Desktop (the normal case) — no Terminal, no Node.js

1. Send them this link to download the extension file:
   https://github.com/gray-wilbee/fub-mcp/releases/latest/download/fub-mcp.mcpb
   (It downloads a file called `fub-mcp.mcpb`, usually to their Downloads folder.)
2. Have them **double-click** that file. Claude Desktop opens an install screen. If it
   doesn't open, they can drag the file into the Claude Desktop window, or use
   Settings → Extensions → Advanced settings → Install Extension.
3. On the install screen there's a masked field for their **Follow Up Boss API key**.
   Tell them where to find it (in Follow Up Boss: **Admin → API**, then copy the
   key), and that they paste it **into that field, not into this chat**. Then they
   click Install. If Claude Desktop warns the extension is unsigned or from an
   unverified developer, that's expected — it's an independent, open-source project
   (https://github.com/gray-wilbee/fub-mcp); let them decide whether to continue.
4. **Installing does not turn it on.** Have them open **Settings → Extensions**, find
   **Follow Up Boss**, and switch the toggle **on**. This is the step people miss.
5. Have them start a **new chat** (existing chats may not pick up new tools) and try:
   "List my 3 most recently added contacts." If it works, they're done.

If step 5 doesn't work: check the toggle is still on, fully quit and reopen Claude
Desktop, and try a new chat again. A wrong or expired API key also looks like a
failure — the fix is to open the extension's settings and re-enter the key.

## Claude Code, or someone comfortable with a terminal

They can register it directly (again — the key goes in their terminal, not this chat):

```
claude mcp add fub-mcp --env FUB_API_KEY=<their key> -- npx -y fub-mcp
```

This needs Node.js 18+. On macOS there's also a guided popup that collects the key
privately: `npx -y fub-mcp setup`.

## What this does NOT do

- Does not enable delete tools. Deletes are off by default; `FUB_MCP_ALLOW_DELETE=1`
  turns them on and should only be added if the user separately, explicitly asks.
- Does not reach Claude on the web or mobile. This is a local extension: it runs only
  in Claude Desktop (or Claude Code) on the user's own computer.
- Optional follow-ups: the repo's `skills/` folder has workflow skills for Smart Lists
  and for email/text templates.
