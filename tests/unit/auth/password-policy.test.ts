import { describe, expect, it } from "vitest";
import { firstLoginPasswordSchema, isCommonPassword } from "@/lib/auth/password-policy";

describe("firstLoginPasswordSchema", () => {
  const base = { currentPassword: "TempPass-9x7q", newPassword: "", confirmNewPassword: "" };

  it("accepts a valid passphrase with spaces, at least 10 characters", () => {
    const result = firstLoginPasswordSchema.safeParse({
      ...base,
      newPassword: "correct horse battery",
      confirmNewPassword: "correct horse battery",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a new password shorter than 10 characters", () => {
    const result = firstLoginPasswordSchema.safeParse({
      ...base,
      newPassword: "short1",
      confirmNewPassword: "short1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a new password longer than the maximum", () => {
    const tooLong = "a".repeat(129);
    const result = firstLoginPasswordSchema.safeParse({
      ...base,
      newPassword: tooLong,
      confirmNewPassword: tooLong,
    });
    expect(result.success).toBe(false);
  });

  it("does not require uppercase, numbers, or symbols", () => {
    const result = firstLoginPasswordSchema.safeParse({
      ...base,
      newPassword: "all lowercase words here",
      confirmNewPassword: "all lowercase words here",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when confirmation does not match", () => {
    const result = firstLoginPasswordSchema.safeParse({
      ...base,
      newPassword: "correct horse battery",
      confirmNewPassword: "different phrase entirely",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("confirmNewPassword"))).toBe(true);
    }
  });

  it("rejects a new password equal to the current (temporary) password", () => {
    const result = firstLoginPasswordSchema.safeParse({
      currentPassword: "TempPass-9x7q",
      newPassword: "TempPass-9x7q",
      confirmNewPassword: "TempPass-9x7q",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a new password equal to the current password with different case/whitespace", () => {
    const result = firstLoginPasswordSchema.safeParse({
      currentPassword: "TempPass-9x7q",
      newPassword: "  temppass-9x7q  ",
      confirmNewPassword: "  temppass-9x7q  ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a common/compromised password from the blocklist", () => {
    const result = firstLoginPasswordSchema.safeParse({
      ...base,
      newPassword: "password123",
      confirmNewPassword: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("isCommonPassword", () => {
  it("flags well-known weak passwords case-insensitively", () => {
    expect(isCommonPassword("password123")).toBe(true);
    expect(isCommonPassword("PASSWORD123")).toBe(true);
    expect(isCommonPassword("qwertyuiop")).toBe(true);
  });

  it("does not flag a reasonable passphrase", () => {
    expect(isCommonPassword("correct horse battery staple")).toBe(false);
  });
});
