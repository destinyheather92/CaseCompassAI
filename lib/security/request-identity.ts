import type { NextRequest } from "next/server";

/** Best-effort client identifier for guest-reachable endpoints (rate limiting, not authorization). */
export function clientIdFor(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
