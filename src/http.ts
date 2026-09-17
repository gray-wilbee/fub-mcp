import { buildAuthHeaders, FubConfig } from "./auth.js";

const BASE_URL = "https://api.followupboss.com/v1";
const MAX_RETRIES = 4;
const MAX_BACKOFF_MS = 120_000;
const DEFAULT_BACKOFF_MS = 60_000;

export interface FubRequest {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string; // e.g. "/people/{id}" — path params already substituted by caller
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}

export interface FubResponse {
  status: number;
  data: unknown;
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const url = new URL(BASE_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * FUB returns 429s under load; Retry-After (seconds) tells us how long to wait.
 * Ported from fubScript's client: retry up to MAX_RETRIES times, capping the wait.
 */
export async function fubRequest(
  config: FubConfig,
  req: FubRequest
): Promise<FubResponse> {
  const url = buildUrl(req.path, req.query);
  const headers = buildAuthHeaders(config);

  let attempt = 0;
  for (;;) {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
    });

    if (res.status === 429 && attempt < MAX_RETRIES) {
      attempt += 1;
      const retryAfterHeader = res.headers.get("Retry-After");
      const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : NaN;
      const waitMs = Number.isFinite(retryAfterSec)
        ? Math.min(retryAfterSec * 1000, MAX_BACKOFF_MS)
        : DEFAULT_BACKOFF_MS;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    if (res.status === 204) {
      return { status: res.status, data: {} };
    }

    const text = await res.text();
    const data = text ? safeJsonParse(text) : {};

    if (!res.ok) {
      const message =
        typeof data === "object" && data !== null && "errorMessage" in data
          ? String((data as Record<string, unknown>).errorMessage)
          : res.statusText;
      throw new FubApiError(res.status, message, data);
    }

    return { status: res.status, data };
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export class FubApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data: unknown) {
    super(`FUB API error ${status}: ${message}`);
    this.status = status;
    this.data = data;
  }
}
