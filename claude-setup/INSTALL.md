# Install the Follow Up Boss extension in Claude Desktop

## Rules for the assistant — read these first

- The user is **not technical**. Do **not** mention Terminal, the command line, `npx`,
  Node.js, or config files. Do **not** ask what kind of computer they use — the steps
  are identical on Mac and Windows.
- **Never ask for their Follow Up Boss API key in this chat.** They paste it into the
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
2. **Open it.** Ask them to double-click that file. Claude Desktop opens an install
   screen. (If nothing happens: drag the file into the Claude Desktop window.)
3. **Enter the key.** The install screen has a masked box for their Follow Up Boss API
   key. Tell them to find it in Follow Up Boss under **Admin → API**, copy it, and
   paste it **into that box** (not into this chat), then click **Install**. If Claude
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
