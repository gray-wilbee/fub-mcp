import { setTimeout as delay } from "node:timers/promises";
import { buildAuthHeaders, FubConfig } from "./auth.js";
import { MAX_INPUT_BYTES } from "./validation.js";

const BASE_URL = "https://api.followupboss.com/v1";
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REQUEST_BUDGET_MS = 30_000;
const MAX_RETRIES = 2;
const MAX_IN_FLIGHT = 4;
let inFlight = 0;

export interface FubRequest {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  signal?: AbortSignal;
}
export interface FubResponse { status: number; data: unknown; }

function buildUrl(path: string, query?: Record<string, unknown>): string {
  // Defense in depth for internal callers as well as MCP argument validation.
  if (!path.startsWith("/") || path.startsWith("//") || /[\\?#]/.test(path) ||
      path.split("/").some(segment => {
        try { const decoded = decodeURIComponent(segment); return decoded === "." || decoded === ".." || /[/\\?#]/.test(decoded); }
        catch { return true; }
      })) throw new Error("Invalid FUB API path.");
  const url = new URL(BASE_URL + path);
  if (url.origin !== "https://api.followupboss.com" || !url.pathname.startsWith("/v1/")) throw new Error("Invalid FUB API origin or path.");
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) continue;
    if (!["string", "number", "boolean"].includes(typeof value)) throw new Error("Query values must be scalar.");
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function retryDelay(header: string | null, now = Date.now()): number {
  if (!header) return 1000;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - now) : 1000;
}

async function readBounded(res: Response): Promise<string> {
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
    await res.body?.cancel();
    throw new Error("FUB response exceeds 2 MiB; request fewer records or fields.");
  }
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) throw new Error("FUB response exceeds 2 MiB; request fewer records or fields.");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}

/** A total 30s budget includes reads and backoff. Only GET 429s are retried. */
export async function fubRequest(config: FubConfig, req: FubRequest): Promise<FubResponse> {
  if (req.method !== "GET" && config.allowWrite !== true) throw new Error("View information mode blocks writes.");
  const url = buildUrl(req.path, req.query);
  const body = req.body === undefined ? undefined : JSON.stringify(req.body);
  if (body && Buffer.byteLength(body) > MAX_INPUT_BYTES) throw new Error("Request exceeds 256 KiB.");
  if (inFlight >= MAX_IN_FLIGHT) throw new Error("Too many concurrent FUB requests; wait for an active request to finish.");
  const deadline = Date.now() + REQUEST_BUDGET_MS;
  const timeout = AbortSignal.timeout(REQUEST_BUDGET_MS);
  const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
  inFlight++;
  try {
    for (let attempt = 0; ; attempt++) {
      signal.throwIfAborted();
      const res = await fetch(url, {
        method: req.method, headers: buildAuthHeaders(config), body,
        redirect: "error", signal,
      });
      if (res.status === 429 && req.method === "GET" && attempt < MAX_RETRIES) {
        const wait = retryDelay(res.headers.get("Retry-After")) + Math.floor(Math.random() * 250);
        await res.body?.cancel();
        // Never shorten a server-requested wait to squeeze in another attempt.
        if (wait >= deadline - Date.now()) throw new FubApiError(429);
        await delay(wait, undefined, { signal });
        continue;
      }
      if (!res.ok) { await res.body?.cancel(); throw new FubApiError(res.status); }
      if (res.status === 204) return { status: 204, data: {} };
      const text = await readBounded(res);
      let data: unknown;
      try { data = text ? JSON.parse(text) : {}; }
      catch { throw new Error("FUB returned an invalid JSON response."); }
      return { status: res.status, data };
    }
  } catch (error) {
    if (error instanceof FubApiError) throw error;
    if (signal.aborted) throw new Error(req.method === "GET" ? "FUB request cancelled or timed out." : "FUB write cancelled or timed out; outcome may be unknown. Check the record before retrying.");
    if (error instanceof Error && /^(FUB response exceeds|FUB returned an invalid)/.test(error.message)) throw error;
    // No upstream bodies, URLs, headers, error causes or credential material.
    throw new Error(req.method === "GET" ? "FUB request failed (network or redirect rejected)." : "FUB write failed; outcome may be unknown. Check the record before retrying.");
  } finally { inFlight--; }
}

export class FubApiError extends Error {
  constructor(public status: number) {
    super(`FUB API returned HTTP ${status}. Check permissions, inputs or rate limits; response details are omitted for privacy.`);
  }
}
