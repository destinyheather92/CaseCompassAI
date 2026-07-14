type Bucket = {
  count: number;
  windowStart: number;
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

/**
 * Simple in-memory sliding-window limiter, keyed by client identifier
 * (typically the request IP). Good enough for a single-instance MVP; swap
 * for a shared store (Redis, Upstash, etc.) before scaling to multiple
 * server instances, since this state doesn't survive a restart or get
 * shared across them.
 */
const buckets = new Map<string, Bucket>();

export function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(clientId);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    buckets.set(clientId, { count: 1, windowStart: now });
    return false;
  }

  bucket.count += 1;
  return bucket.count > MAX_REQUESTS_PER_WINDOW;
}
