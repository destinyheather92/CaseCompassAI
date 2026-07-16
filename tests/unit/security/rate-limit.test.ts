import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "@/lib/security/rate-limit";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests below the threshold", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    expect(limiter.isLimited("user-a")).toBe(false);
    expect(limiter.isLimited("user-a")).toBe(false);
    expect(limiter.isLimited("user-a")).toBe(false);
  });

  it("blocks requests once the threshold is exceeded within the window", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    limiter.isLimited("user-a");
    limiter.isLimited("user-a");
    limiter.isLimited("user-a");
    expect(limiter.isLimited("user-a")).toBe(true);
  });

  it("scopes limits independently per key", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.isLimited("user-a")).toBe(false);
    expect(limiter.isLimited("user-b")).toBe(false);
    expect(limiter.isLimited("user-a")).toBe(true);
    expect(limiter.isLimited("user-b")).toBe(true);
  });

  it("allows requests again once the window has fully elapsed", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(limiter.isLimited("user-a")).toBe(false);
    expect(limiter.isLimited("user-a")).toBe(true);

    vi.advanceTimersByTime(60_001);

    expect(limiter.isLimited("user-a")).toBe(false);
  });

  it("does not expose account existence: an unknown key behaves identically to a fresh known key", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    expect(limiter.isLimited("never-seen-before")).toBe(false);
    expect(limiter.isLimited("never-seen-before")).toBe(false);
    expect(limiter.isLimited("never-seen-before")).toBe(true);
  });

  it("reset(key) clears only that key", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    limiter.isLimited("user-a");
    limiter.isLimited("user-b");
    limiter.reset("user-a");
    expect(limiter.isLimited("user-a")).toBe(false);
    expect(limiter.isLimited("user-b")).toBe(true);
  });

  it("reset() with no key clears all keys", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    limiter.isLimited("user-a");
    limiter.isLimited("user-b");
    limiter.reset();
    expect(limiter.isLimited("user-a")).toBe(false);
    expect(limiter.isLimited("user-b")).toBe(false);
  });
});
