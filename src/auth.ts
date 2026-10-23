import { readLocalEnvFile, LOCAL_ENV_FILE } from "./local-store.js";

export interface FubConfig {
  apiKey: string;
  systemName: string;
  systemKey?: string;
  allowWrite?: boolean;
  allowDelete: boolean;
  allowWebhooks?: boolean;
  allowAutomations?: boolean;
  webhookHosts?: string[];
}

const DEFAULT_SYSTEM_NAME = "fub-mcp";

/**
 * Treats unset, blank, and unsubstituted-template values (a client that
 * fails to fill in an optional field may pass the literal "${user_config.x}"
 * through) as "not provided", so a blank optional setting can never become
 * a garbage header.
 */
function providedEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  if (!v || v.includes("${")) return undefined;
  return v;
}

function enabled(name: string): boolean {
  const value = providedEnv(name);
  if (value === undefined || value === "0" || value === "false") return false;
  if (value === "1" || value === "true") return true;
  throw new Error(`${name} must be 0/false or 1/true.`);
}

export function loadConfig(): FubConfig {
  // Prefer the client config's env block if set; otherwise fall back to the
  // key saved locally by `fub-mcp setup` (native popup, never touches an LLM
  // context). This lets claude_desktop_config.json stay secret-free.
  const apiKey = providedEnv("FUB_API_KEY") || readLocalEnvFile().FUB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FUB_API_KEY is not set. Use protected host settings, or on macOS run the installed `fub-mcp setup` for a native " +
        `popup (saved to ${LOCAL_ENV_FILE}), or set FUB_API_KEY directly in your ` +
        "MCP client's server config."
    );
  }
  const customSystemName = providedEnv("FUB_MCP_SYSTEM_NAME");
  let systemKey = providedEnv("FUB_MCP_SYSTEM_KEY");
  if (systemKey && !customSystemName) {
    // A system key only means something alongside the system name it was issued
    // for; sending it with our default name would just be a mismatched header.
    console.error(
      "fub-mcp: FUB_MCP_SYSTEM_KEY ignored because FUB_MCP_SYSTEM_NAME is not set."
    );
    systemKey = undefined;
  }
  return {
    apiKey,
    systemName: customSystemName ?? DEFAULT_SYSTEM_NAME,
    systemKey,
    allowWrite: enabled("FUB_MCP_ALLOW_WRITE"),
    allowDelete: enabled("FUB_MCP_ALLOW_DELETE"),
    allowWebhooks: enabled("FUB_MCP_ALLOW_WEBHOOKS"),
    allowAutomations: enabled("FUB_MCP_ALLOW_AUTOMATIONS"),
    webhookHosts: (providedEnv("FUB_MCP_WEBHOOK_HOSTS") ?? "").split(",").map(h => h.trim().toLowerCase()).filter(Boolean),
  };
}

export function buildAuthHeaders(config: FubConfig): Record<string, string> {
  const basic = Buffer.from(`${config.apiKey}:`, "utf8").toString("base64");
  const headers: Record<string, string> = {
    Authorization: `Basic ${basic}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-System": config.systemName,
  };
  if (config.systemKey) {
    headers["X-System-Key"] = config.systemKey;
  }
  return headers;
}
