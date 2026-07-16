import { createRateLimiter } from "@/lib/security/rate-limit";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

const limiter = createRateLimiter({ windowMs: WINDOW_MS, max: MAX_REQUESTS_PER_WINDOW });

/**
 * Simple in-memory sliding-window limiter, keyed by client identifier
 * (typically the request IP). Good enough for a single-instance MVP; swap
 * for a shared store (Redis, Upstash, etc.) before scaling to multiple
 * server instances, since this state doesn't survive a restart or get
 * shared across them.
 */
export function isRateLimited(clientId: string): boolean {
  return limiter.isLimited(clientId);
}
