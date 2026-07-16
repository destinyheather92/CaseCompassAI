import type { NextRequest } from "next/server";

export const MAX_JSON_BODY_BYTES = 20_000;

/** Best-effort request-size guard using the Content-Length header — a cheap first line of defense before parsing the body. */
export function isRequestTooLarge(request: NextRequest, maxBytes: number = MAX_JSON_BODY_BYTES): boolean {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return false;
  const bytes = Number(contentLength);
  return Number.isFinite(bytes) && bytes > maxBytes;
}
