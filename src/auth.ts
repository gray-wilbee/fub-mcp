export interface FubConfig {
  apiKey: string;
  systemName: string;
  systemKey?: string;
  allowDelete: boolean;
}

export function loadConfig(): FubConfig {
  const apiKey = process.env.FUB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FUB_API_KEY is not set. Add it to your MCP client's server config (env) " +
        "or a local .env file — see .env.example."
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
