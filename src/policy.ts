import { isIP } from "node:net";
import { FubConfig } from "./auth.js";
import { ToolDef } from "./types.js";

export function accessError(config: FubConfig, tool: ToolDef): string | undefined {
  if (tool.method === "GET") return undefined;
  if (config.allowWrite !== true) return "View information mode: enable FUB_MCP_ALLOW_WRITE=1 to make changes.";
  if (tool.method === "DELETE" && !config.allowDelete) return "Permanent deletes require FUB_MCP_ALLOW_DELETE=1.";
  if (/^\/webhooks(?:\/|$)/.test(tool.pathTemplate) && !config.allowWebhooks) return "Webhook changes require FUB_MCP_ALLOW_WEBHOOKS=1.";
  if (/^\/(events|actionPlansPeople|automationsPeople)(?:\/|$)/.test(tool.pathTemplate) && !config.allowAutomations) return "Direct workflow triggers require FUB_MCP_ALLOW_AUTOMATIONS=1.";
  return undefined;
}

export function validateWebhook(config: FubConfig, tool: ToolDef, body: Record<string, unknown>): void {
  if (!/^\/webhooks(?:\/|$)/.test(tool.pathTemplate) || body.url === undefined) return;
  let url: URL;
  try { url = new URL(String(body.url)); } catch { throw new Error("Webhook URL must be a valid HTTPS URL."); }
  const hosts = config.webhookHosts ?? [];
  const hostname = url.hostname;
  const ipCandidate = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  if (url.protocol !== "https:" || url.username || url.password || url.hash ||
      (url.port && url.port !== "443") || isIP(ipCandidate) ||
      hostname.endsWith(".") || url.hostname === "localhost" || url.hostname.endsWith(".localhost") ||
      !hosts.includes(url.hostname)) {
    throw new Error("Webhook destination must use HTTPS on port 443 and an exact host in FUB_MCP_WEBHOOK_HOSTS, without credentials or fragments.");
  }
}
