import { describe, expect, it } from "vitest";
import {
  requireActiveAccount,
  requirePasswordChangeComplete,
  requireRole,
  requireInstitutionAccess,
  requireFacilityAccess,
  type AppUser,
} from "@/lib/auth/authorization";

function makeUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: "user-1",
    clerkUserId: "clerk-1",
    role: "INCARCERATED_USER",
    accountStatus: "ACTIVE",
    institutionId: "inst-1",
    facilityId: "fac-1",
    mustChangePassword: false,
    ...overrides,
  };
}

describe("requireActiveAccount", () => {
  it("allows an ACTIVE account", () => {
    const result = requireActiveAccount(makeUser({ accountStatus: "ACTIVE" }));
    expect(result.ok).toBe(true);
  });

  it("allows a PENDING_FIRST_LOGIN account (it must reach the password-change gate, not be blocked earlier)", () => {
    const result = requireActiveAccount(makeUser({ accountStatus: "PENDING_FIRST_LOGIN" }));
    expect(result.ok).toBe(true);
  });

  it("rejects a DISABLED account", () => {
    const result = requireActiveAccount(makeUser({ accountStatus: "DISABLED" }));
    expect(result).toEqual({ ok: false, reason: "account-disabled", redirectTo: "/sign-in" });
  });

  it("rejects a LOCKED account", () => {
    const result = requireActiveAccount(makeUser({ accountStatus: "LOCKED" }));
    expect(result).toEqual({ ok: false, reason: "account-locked", redirectTo: "/sign-in" });
  });

  it("rejects a TEMPORARY_PASSWORD_EXPIRED account", () => {
    const result = requireActiveAccount(makeUser({ accountStatus: "TEMPORARY_PASSWORD_EXPIRED" }));
    expect(result).toEqual({ ok: false, reason: "temporary-password-expired", redirectTo: "/institution/login" });
  });
});

describe("requirePasswordChangeComplete", () => {
  it("allows a user who has already changed their password", () => {
    const result = requirePasswordChangeComplete(makeUser({ mustChangePassword: false }));
    expect(result.ok).toBe(true);
  });

  it("blocks an institution-managed user with mustChangePassword=true and redirects to /first-login", () => {
    const result = requirePasswordChangeComplete(makeUser({ role: "INCARCERATED_USER", mustChangePassword: true }));
    expect(result).toEqual({ ok: false, reason: "must-change-password", redirectTo: "/first-login" });
  });

  it("never blocks an INDIVIDUAL account — the temporary-password lifecycle is institution-only, even if mustChangePassword is somehow true", () => {
    const result = requirePasswordChangeComplete(makeUser({ role: "INDIVIDUAL", mustChangePassword: true }));
    expect(result.ok).toBe(true);
  });
});

describe("requireRole", () => {
  it("allows a user whose role is in the allowed list", () => {
    const result = requireRole(makeUser({ role: "INSTITUTION_ADMIN" }), ["INSTITUTION_ADMIN", "SYSTEM_ADMIN"]);
    expect(result.ok).toBe(true);
  });

  it("rejects a user whose role is not in the allowed list", () => {
    const result = requireRole(makeUser({ role: "INCARCERATED_USER" }), ["INSTITUTION_ADMIN"]);
    expect(result).toEqual({ ok: false, reason: "forbidden-role", redirectTo: "/" });
  });

  it("a user cannot use a client-declared role to pass this check — only the loaded AppUser.role is consulted", () => {
    // The type system already prevents passing an arbitrary role string, but
    // this documents the invariant: requireRole only ever reads user.role
    // from the server-loaded AppUser, never from request input.
    const user = makeUser({ role: "INCARCERATED_USER" });
    const result = requireRole(user, ["SYSTEM_ADMIN"]);
    expect(result.ok).toBe(false);
  });
});

describe("requireInstitutionAccess", () => {
  it("allows access when the user's institution matches the target institution", () => {
    const result = requireInstitutionAccess(makeUser({ institutionId: "inst-1" }), "inst-1");
    expect(result.ok).toBe(true);
  });

  it("rejects access when the user's institution does not match the target institution", () => {
    const result = requireInstitutionAccess(makeUser({ institutionId: "inst-1" }), "inst-2");
    expect(result).toEqual({ ok: false, reason: "forbidden-institution", redirectTo: "/" });
  });

  it("rejects a user with no institution at all", () => {
    const result = requireInstitutionAccess(makeUser({ institutionId: null }), "inst-2");
    expect(result.ok).toBe(false);
  });
});

describe("requireFacilityAccess", () => {
  it("allows access when the user's facility matches the target facility", () => {
    const result = requireFacilityAccess(makeUser({ facilityId: "fac-1" }), "fac-1");
    expect(result.ok).toBe(true);
  });

  it("rejects access when the user's facility does not match the target facility", () => {
    const result = requireFacilityAccess(makeUser({ facilityId: "fac-1" }), "fac-2");
    expect(result).toEqual({ ok: false, reason: "forbidden-facility", redirectTo: "/" });
  });
});
