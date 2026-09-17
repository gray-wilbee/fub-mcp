import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeLocalApiKey, LOCAL_ENV_FILE } from "./local-store.js";
import { fubRequest } from "./http.js";

const CLAUDE_CONFIG_PATH = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "Claude",
  "claude_desktop_config.json"
);

const MAX_ATTEMPTS = 3;

function osascriptString(s: string): string {
  // AppleScript string literals: escape backslashes and double quotes.
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function macPromptHidden(message: string): string | null {
  const script =
    `text returned of (display dialog ${osascriptString(message)} ` +
    `default answer "" with title "fub-mcp setup" with hidden answer)`;
  try {
    return execFileSync("osascript", ["-e", script], { encoding: "utf8" }).trim();
  } catch {
    return null; // user clicked Cancel, or no GUI session available
  }
}

function macAlert(message: string): void {
  try {
    execFileSync("osascript", [
      "-e",
      `display alert ${osascriptString("fub-mcp setup")} message ${osascriptString(
        message
      )}`,
    ]);
  } catch {
    // best effort — terminal output below is the fallback
  }
}

async function validateKey(apiKey: string): Promise<string | null> {
  try {
    const config = { apiKey, systemName: "fub-mcp-setup", allowDelete: false };
    const res = await fubRequest(config, { method: "GET", path: "/me" });
    const data = res.data as { name?: string; email?: string };
    return data?.name || data?.email || "your FUB account";
  } catch {
    return null;
  }
}

export function mergeClaudeConfig(
  serverEntry: Record<string, unknown>,
  opts: { overwrite?: boolean } = {}
): { wrote: boolean; message: string } {
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(CLAUDE_CONFIG_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(CLAUDE_CONFIG_PATH, "utf8"));
    } catch {
      return {
        wrote: false,
        message:
          `${CLAUDE_CONFIG_PATH} exists but isn't valid JSON — leaving it untouched. ` +
          "Add the fub-mcp entry manually; see README.md.",
      };
    }
  }

  const mcpServers = (existing.mcpServers as Record<string, unknown>) || {};
  if ((mcpServers.fubMcp || mcpServers["fub-mcp"]) && !opts.overwrite) {
    return {
      wrote: false,
      message: "An mcpServers entry for fub-mcp already exists — left it as-is.",
    };
  }

  mcpServers["fub-mcp"] = serverEntry;
  existing.mcpServers = mcpServers;

  fs.mkdirSync(path.dirname(CLAUDE_CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CLAUDE_CONFIG_PATH, JSON.stringify(existing, null, 2) + "\n");
  return {
    wrote: true,
    message: `Set fub-mcp entry in ${CLAUDE_CONFIG_PATH} (no secret stored in that file).`,
  };
}

export async function runSetup(opts: { local?: boolean } = {}): Promise<void> {
  if (process.platform !== "darwin") {
    console.error(
      "`fub-mcp setup`'s native popup currently only supports macOS.\n" +
        "On other platforms, set FUB_API_KEY directly in your MCP client's server " +
        "config, or run `npx fub-mcp setup` again once Windows/Linux support ships.\n" +
        "See README.md for the manual config snippet."
    );
    process.exitCode = 1;
    return;
  }

  console.log("fub-mcp setup: a popup should appear on your screen...");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const key = macPromptHidden(
      attempt === 1
        ? "Enter your Follow Up Boss API key (FUB → Admin → API):"
        : "That key didn't work. Try again (FUB → Admin → API):"
    );

    if (key === null) {
      console.log("Setup cancelled.");
      return;
    }
    if (!key) {
      macAlert("No key entered. Let's try again.");
      continue;
    }

    console.log("Validating key against the Follow Up Boss API...");
    const account = await validateKey(key);
    if (!account) {
      if (attempt === MAX_ATTEMPTS) {
        macAlert("Still couldn't validate that key. Setup stopped — no changes made.");
        console.error("Key validation failed 3 times. No changes were made.");
        process.exitCode = 1;
        return;
      }
      continue;
    }

    writeLocalApiKey(key);
    const serverEntry = opts.local
      ? {
          command: process.execPath, // this Node binary, for reproducible dev testing
          args: [path.join(path.dirname(new URL(import.meta.url).pathname), "index.js")],
        }
      : { command: "npx", args: ["-y", "fub-mcp"] };
    const configResult = mergeClaudeConfig(serverEntry, { overwrite: opts.local });

    macAlert(
      `Connected to ${account}. Key saved locally.\n${configResult.message}\n\n` +
        "Fully quit and reopen Claude Desktop to finish."
    );
    console.log(`Success — connected to ${account}.`);
    console.log(`API key saved to ${LOCAL_ENV_FILE} (not in any Claude config file).`);
    console.log(configResult.message);
    console.log("Fully quit and reopen Claude Desktop to finish.");
    return;
  }
}
