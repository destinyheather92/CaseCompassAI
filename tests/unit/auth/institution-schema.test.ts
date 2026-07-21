import { describe, expect, it } from "vitest";
import { institutionUserCreateSchema, mapApiRoleToPrismaRole } from "@/lib/institution/institution-schema";

describe("institutionUserCreateSchema", () => {
  it("accepts a minimal valid payload (role only, system-generated username)", () => {
    const result = institutionUserCreateSchema.safeParse({ role: "incarcerated-user" });
    expect(result.success).toBe(true);
  });

  it("accepts a full valid payload", () => {
    const result = institutionUserCreateSchema.safeParse({
      role: "educator",
      username: "ridgeview-p52x91",
      displayName: "J. Rivera",
      facilityId: "clx0000000000000000000000",
      internalIdentifier: "case-42",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a role outside the institution-assignable roles", () => {
    const result = institutionUserCreateSchema.safeParse({ role: "system-admin" });
    expect(result.success).toBe(false);
  });

  it("rejects institution-admin as an assignable role via this endpoint (never assignable through this form)", () => {
    const result = institutionUserCreateSchema.safeParse({ role: "institution-admin" });
    expect(result.success).toBe(false);
  });

  it("accepts the inmate-specific fields (firstName, lastName, docNumber, housingUnit)", () => {
    const result = institutionUserCreateSchema.safeParse({
      role: "incarcerated-user",
      firstName: "Jordan",
      lastName: "Rivera",
      docNumber: "SC-00012345",
      housingUnit: "Block C",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing role", () => {
    const result = institutionUserCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects an unsafe/invalid username shape", () => {
    const result = institutionUserCreateSchema.safeParse({ role: "incarcerated-user", username: "Not Valid! <script>" });
    expect(result.success).toBe(false);
  });

  it("strips unknown keys rather than allowing arbitrary client-declared scope fields", () => {
    const result = institutionUserCreateSchema.safeParse({
      role: "incarcerated-user",
      institutionId: "attacker-supplied-institution-id",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>).institutionId).toBeUndefined();
    }
  });
});

describe("mapApiRoleToPrismaRole", () => {
  it("maps each assignable API role to its Prisma enum value", () => {
    expect(mapApiRoleToPrismaRole("incarcerated-user")).toBe("INCARCERATED_USER");
    expect(mapApiRoleToPrismaRole("educator")).toBe("EDUCATOR");
    expect(mapApiRoleToPrismaRole("legal-aid-staff")).toBe("LEGAL_AID_STAFF");
  });
});
