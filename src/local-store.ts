import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const LOCAL_STORE_DIR = path.join(os.homedir(), ".fub-mcp");
export const LOCAL_ENV_FILE = path.join(LOCAL_STORE_DIR, ".env");

/**
 * Minimal KEY=value reader — avoids pulling in a dotenv dependency for a
 * single variable. Ignores blank lines and lines starting with #.
 */
export function readLocalEnvFile(): Record<string, string> {
  if (!fs.existsSync(LOCAL_ENV_FILE)) return {};
  const out: Record<string, string> = {};
  const text = fs.readFileSync(LOCAL_ENV_FILE, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

export function writeLocalApiKey(apiKey: string): void {
  fs.mkdirSync(LOCAL_STORE_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(LOCAL_ENV_FILE, `FUB_API_KEY=${apiKey}\n`, { mode: 0o600 });
  fs.chmodSync(LOCAL_STORE_DIR, 0o700);
  fs.chmodSync(LOCAL_ENV_FILE, 0o600);
}
