import { describe, expect, it } from "vitest";
import { checkIntakeSessionAccess } from "@/lib/intake/intake-access";
import type { AppUser } from "@/lib/auth/authorization";

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "user-1",
    clerkUserId: "clerk-1",
    role: "INDIVIDUAL",
    accountStatus: "ACTIVE",
    institutionId: null,
    facilityId: null,
    mustChangePassword: false,
    ...overrides,
  };
}

describe("checkIntakeSessionAccess", () => {
  it("allows the owning authenticated user", () => {
    const result = checkIntakeSessionAccess({ userId: "user-1" }, makeUser({ id: "user-1" }));
    expect(result).toEqual({ ok: true });
  });

  it("rejects a different authenticated user (cross-user access)", () => {
    const result = checkIntakeSessionAccess({ userId: "user-1" }, makeUser({ id: "user-2" }));
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("rejects a guest trying to access another user's owned session", () => {
    const result = checkIntakeSessionAccess({ userId: "user-1" }, null);
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("allows anyone holding the session id for an unowned (guest) session", () => {
    expect(checkIntakeSessionAccess({ userId: null }, null)).toEqual({ ok: true });
    expect(checkIntakeSessionAccess({ userId: null }, makeUser())).toEqual({ ok: true });
  });
});
