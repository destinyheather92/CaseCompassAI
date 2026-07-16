import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safeLog, redact } from "@/lib/security/safe-logger";

describe("redact", () => {
  it("redacts known secret-shaped keys at the top level", () => {
    const result = redact({ username: "scdc-k7m482", password: "hunter2" }) as Record<string, unknown>;
    expect(result.username).toBe("scdc-k7m482");
    expect(result.password).toBe("[REDACTED]");
  });

  it("redacts secret keys regardless of case", () => {
    const result = redact({ Password: "a", PASSWORD: "b", TempPassword: "c" }) as Record<string, unknown>;
    expect(result.Password).toBe("[REDACTED]");
    expect(result.PASSWORD).toBe("[REDACTED]");
    expect(result.TempPassword).toBe("[REDACTED]");
  });

  it("redacts nested secret keys", () => {
    const result = redact({
      user: { id: "u1", passwordHash: "abc123" },
    }) as { user: Record<string, unknown> };
    expect(result.user.id).toBe("u1");
    expect(result.user.passwordHash).toBe("[REDACTED]");
  });

  it("redacts secrets inside arrays of objects", () => {
    const result = redact({
      users: [
        { id: "u1", temporaryPassword: "abc" },
        { id: "u2", temporaryPassword: "def" },
      ],
    }) as { users: Record<string, unknown>[] };
    expect(result.users[0].temporaryPassword).toBe("[REDACTED]");
    expect(result.users[1].temporaryPassword).toBe("[REDACTED]");
    expect(result.users[0].id).toBe("u1");
  });

  it("redacts common secret field names: token, apiKey, ssn, description, prompt", () => {
    const result = redact({
      token: "t",
      apiKey: "k",
      ssn: "s",
      description: "full case narrative",
      prompt: "system prompt text",
    }) as Record<string, unknown>;
    expect(result.token).toBe("[REDACTED]");
    expect(result.apiKey).toBe("[REDACTED]");
    expect(result.ssn).toBe("[REDACTED]");
    expect(result.description).toBe("[REDACTED]");
    expect(result.prompt).toBe("[REDACTED]");
  });

  it("leaves non-secret fields untouched", () => {
    const result = redact({ id: "u1", role: "individual", count: 3 }) as Record<string, unknown>;
    expect(result).toEqual({ id: "u1", role: "individual", count: 3 });
  });

  it("does not mutate the original object", () => {
    const original = { password: "hunter2" };
    redact(original);
    expect(original.password).toBe("hunter2");
  });
});

describe("safeLog", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a redacted version of the provided data, never the raw secret", () => {
    safeLog("info", "user created", { username: "scdc-k7m482", temporaryPassword: "hunter2" });

    expect(console.info).toHaveBeenCalledTimes(1);
    const loggedPayload = JSON.stringify((console.info as ReturnType<typeof vi.fn>).mock.calls[0]);
    expect(loggedPayload).not.toContain("hunter2");
    expect(loggedPayload).toContain("scdc-k7m482");
  });
});
