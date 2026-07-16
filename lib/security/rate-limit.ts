type Bucket = {
  count: number;
  windowStart: number;
};

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
}

export interface RateLimiter {
  /** Returns true when the caller has exceeded `max` requests in the current window. */
  isLimited(key: string): boolean;
  /** Clears state for one key, or every key when called with no argument. */
  reset(key?: string): void;
}

/**
 * In-memory sliding-window limiter, keyed by an arbitrary string (IP,
 * user id, username, etc). Every key is treated identically whether or
 * not it's been seen before, so rate-limit responses never leak whether
 * an identifier (e.g. a username) already exists.
 *
 * Good enough for a single-instance deployment; swap for a shared store
 * (Redis, Upstash, etc.) before scaling to multiple server instances,
 * since this state doesn't survive a restart or get shared across them.
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { windowMs, max } = options;
  const buckets = new Map<string, Bucket>();

  return {
    isLimited(key: string): boolean {
      const now = Date.now();
      const bucket = buckets.get(key);

      if (!bucket || now - bucket.windowStart > windowMs) {
        buckets.set(key, { count: 1, windowStart: now });
        return false;
      }

      bucket.count += 1;
      return bucket.count > max;
    },
    reset(key?: string): void {
      if (key === undefined) {
        buckets.clear();
        return;
      }
      buckets.delete(key);
    },
  };
}
