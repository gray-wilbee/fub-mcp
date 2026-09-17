import { readLocalEnvFile, LOCAL_ENV_FILE } from "./local-store.js";

export interface FubConfig {
  apiKey: string;
  systemName: string;
  systemKey?: string;
  allowDelete: boolean;
}

export function loadConfig(): FubConfig {
  // Prefer the client config's env block if set; otherwise fall back to the
  // key saved locally by `fub-mcp setup` (native popup, never touches an LLM
  // context). This lets claude_desktop_config.json stay secret-free.
  const local = readLocalEnvFile();
  const apiKey = process.env.FUB_API_KEY || local.FUB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FUB_API_KEY is not set. Run `npx fub-mcp setup` to enter it via a native " +
        `popup (saved to ${LOCAL_ENV_FILE}), or set FUB_API_KEY directly in your ` +
        "MCP client's server config."
    );
  }
  return {
    apiKey,
    systemName: process.env.FUB_MCP_SYSTEM_NAME?.trim() || "fub-mcp",
    systemKey: process.env.FUB_MCP_SYSTEM_KEY?.trim() || undefined,
    allowDelete: process.env.FUB_MCP_ALLOW_DELETE === "1",
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
