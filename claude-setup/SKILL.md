---
name: fub-mcp-setup
description: Use when the user wants to install the Follow Up Boss (fub-mcp) extension for Claude Desktop, e.g. "set up my FUB tools" or "install the Follow Up Boss extension."
---

# Install the Follow Up Boss extension in Claude Desktop

## Rules for the assistant — read these first

- The user is **not technical**. Do **not** mention Terminal, the command line, `npx`,
  Node.js, or config files. Do **not** ask what kind of computer they use — the steps
  are identical on Mac and Windows.
- **Never ask for their Follow Up Boss API key, or any "system key", in this chat.** They paste it into the
  install screen's own masked field. (Chat messages are stored and, on consumer
  accounts, may be used for training by default — a CRM key must not go there.)
- You can't install anything for them. **Give exactly one step at a time and wait for
  them to confirm before the next.** Keep each step short and concrete.
- Only if the user says they use **Claude Code** (a developer tool, not Claude
  Desktop), see the last section. Otherwise never bring it up.

## Steps

1. **Download the file.** Give them this link and ask them to click it:
   https://github.com/gray-wilbee/fub-mcp/releases/latest/download/fub-mcp.mcpb
   It saves a file called `fub-mcp.mcpb`, usually into their Downloads folder.
2. **Install it from inside Claude Desktop.** Ask them to open Claude Desktop, go to
   **Settings → Extensions → Advanced settings → Install Extension…**, and choose the
   downloaded `fub-mcp.mcpb` (it's in their Downloads folder). Dragging the file onto
   the Claude Desktop window also works. **Don't tell them to double-click it** —
   that works on some computers but on Windows it offers Notepad or Media Player
   instead of Claude. If such an "Open with" window ever appears, tell them to cancel
   it and not pick another app. (Menu names can shift slightly between app versions;
   look for "Extensions".)
3. **Enter the key.** The install screen has a masked box for their Follow Up Boss API
   key. Tell them to find it in Follow Up Boss under **Admin → API**, copy it, and
   paste it **into that box** (not into this chat), then click **Install**. The screen
   may also show two boxes marked "(Optional)" about a registered system ID and key —
   tell them to leave those blank for now. If Claude
   Desktop warns the extension is unsigned or from an unverified developer, that's
   expected — it's an independent, open-source project
   (https://github.com/gray-wilbee/fub-mcp); let them decide whether to continue.
4. **Turn it on.** Installing does *not* switch it on. Ask them to open Claude Desktop
   **Settings → Extensions**, find **Follow Up Boss**, and turn the toggle **on**.
   This is the step people miss.
5. **Try it.** Ask them to start a **new chat** (older chats may not pick up new
   tools) and type: *List my 3 most recently added contacts.*

If step 5 doesn't work: check the toggle is still on, fully quit and reopen Claude
Desktop, and try a new chat. A wrong or expired API key also looks like a failure —
the fix is to open the extension's settings and re-enter the key.

## Optional — only if they ask about rate limits, "registering," or heavy use

Follow Up Boss lets each customer register their own "system" for a higher request
rate. Don't bring this up unprompted. If they ask:

1. Send them to https://apps.followupboss.com/system-registration to fill in the form
   themselves (a system name, a "System ID Header" of their choosing, and their name,
   email, and organization). FUB provides a **system key** afterwards.
2. They enter the system ID and the system key in the two optional boxes: Claude
   Desktop **Settings → Extensions → Follow Up Boss**, then restart Claude Desktop.
3. **The system key is a secret. Never ask them to paste or read it to you, and never
   repeat it.** It goes only into that masked box — not this chat, email, a
   screenshot, or a plain-text file (a password manager is fine). If they paste it
   into the chat anyway, don't use it: tell them to enter it in the masked box
   instead, and that because it appeared in a conversation they should email
   api@followupboss.com and ask for a replacement key.

## Good to know (mention only if they ask)

- Their key is stored in their computer's secure keychain and is only ever sent
  directly to Follow Up Boss.
- Deleting records is switched off by default.
- It works in Claude Desktop only (not claude.ai in a browser, and not the phone app).

## Only if the user says they use Claude Code

They can register it themselves; the key goes in their terminal, not this chat. Needs
Node.js 18+:

```
claude mcp add fub-mcp --env FUB_API_KEY=<their key> -- npx -y fub-mcp
```
