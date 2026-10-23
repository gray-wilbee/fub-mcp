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
  if (!apiKey || /[\r\n\0]/.test(apiKey)) throw new Error("API key must be a nonempty single line.");
  fs.mkdirSync(LOCAL_STORE_DIR, { recursive: true, mode: 0o700 });
  if (fs.lstatSync(LOCAL_STORE_DIR).isSymbolicLink()) throw new Error("Credential directory must not be a symbolic link.");
  fs.chmodSync(LOCAL_STORE_DIR, 0o700);
  const temporary = path.join(LOCAL_STORE_DIR, `.env-${process.pid}-${Date.now()}`);
  const fd = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(fd, `FUB_API_KEY=${apiKey}\n`);
    // Atomic replacement avoids following a preexisting file symlink or writing
    // secret bytes into an existing file with overly broad permissions.
    fs.renameSync(temporary, LOCAL_ENV_FILE);
  } finally {
    fs.closeSync(fd);
    fs.rmSync(temporary, { force: true });
  }
}
