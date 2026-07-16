import { describe, expect, it } from "vitest";
import { generateUsername, generateTemporaryPassword } from "@/lib/auth/generate-credentials";
import { isCommonPassword, PASSWORD_MIN_LENGTH } from "@/lib/auth/password-policy";

describe("generateUsername", () => {
  it("produces a facilitycode-<6 char suffix> username", () => {
    const username = generateUsername("SCDC");
    expect(username).toMatch(/^scdc-[a-z2-9]{6}$/);
  });

  it("sanitizes and lowercases an arbitrary facility code", () => {
    const username = generateUsername("Ridge View #1");
    expect(username).toMatch(/^ridgeview1-[a-z2-9]{6}$/);
  });

  it("does not use visually ambiguous characters (0/o/1/l/i)", () => {
    for (let i = 0; i < 200; i++) {
      const [, suffix] = generateUsername("fac").split("-");
      expect(suffix).not.toMatch(/[01ilo]/);
    }
  });

  it("generates unique, non-sequential suffixes across many calls", () => {
    const usernames = new Set(Array.from({ length: 1000 }, () => generateUsername("fac")));
    expect(usernames.size).toBe(1000);
  });
});

describe("generateTemporaryPassword", () => {
  it("meets the minimum password policy length", () => {
    const password = generateTemporaryPassword();
    expect(password.length).toBeGreaterThanOrEqual(PASSWORD_MIN_LENGTH);
  });

  it("is never a common/blocklisted password", () => {
    for (let i = 0; i < 200; i++) {
      expect(isCommonPassword(generateTemporaryPassword())).toBe(false);
    }
  });

  it("generates unique values across many calls (no fixed/predictable output)", () => {
    const passwords = new Set(Array.from({ length: 1000 }, () => generateTemporaryPassword()));
    expect(passwords.size).toBe(1000);
  });

  it("does not produce a simple incrementing or sequential pattern between consecutive calls", () => {
    const a = generateTemporaryPassword();
    const b = generateTemporaryPassword();
    // A naive counter-based "generator" would share a long common prefix; a
    // cryptographically random one essentially never will.
    let sharedPrefixLength = 0;
    while (sharedPrefixLength < a.length && a[sharedPrefixLength] === b[sharedPrefixLength]) {
      sharedPrefixLength++;
    }
    expect(sharedPrefixLength).toBeLessThan(4);
  });
});
