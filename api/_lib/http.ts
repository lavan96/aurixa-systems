/**
 * Minimal request/response helpers for the same-origin Aurixa API.
 *
 * Typed against Node's own http types rather than a platform SDK, so the
 * handlers run unchanged under Vercel's Node runtime and under a plain Node
 * server for local verification. No new dependency is introduced.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

/** Vercel populates `body`/`query` on the request; plain Node does not. */
export type ApiRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[]>;
};

export type ApiResponse = ServerResponse;

const MAX_BODY_BYTES = 128 * 1024;

/**
 * Reads and parses a JSON body. Uses the platform-parsed body when present,
 * otherwise consumes the stream. Returns null on anything unparseable or
 * oversized rather than throwing.
 */
export async function readJsonBody(req: ApiRequest): Promise<Record<string, unknown> | null> {
  if (req.body && typeof req.body === "object") return req.body as Record<string, unknown>;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  const chunks: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of req) {
      const buffer = chunk as Buffer;
      size += buffer.length;
      if (size > MAX_BODY_BYTES) return null;
      chunks.push(buffer);
    }
  } catch {
    return null;
  }

  if (chunks.length === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function sendJson(res: ApiResponse, status: number, body: unknown, cookies: string[] = []): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  // Session state must never be cached by a CDN or the browser.
  res.setHeader("cache-control", "no-store, private");
  if (cookies.length > 0) res.setHeader("set-cookie", cookies);
  res.end(JSON.stringify(body));
}

/**
 * Secure cookies everywhere except a plain-HTTP local host, so verification can
 * run over http://localhost while production always gets `Secure`.
 */
export function isSecureContext(req: ApiRequest): boolean {
  const proto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  if (proto) return proto === "https";
  const host = String(req.headers.host ?? "");
  return !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
}

/**
 * Same-origin enforcement. The session endpoints are only ever called by the
 * Aurixa site itself, so a cross-site request is refused outright — defence in
 * depth alongside `SameSite=Strict`.
 */
export function isSameOrigin(req: ApiRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // Same-origin GETs often omit Origin.
  try {
    return new URL(String(origin)).host === String(req.headers.host ?? "");
  } catch {
    return false;
  }
}
