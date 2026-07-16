import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/security/audit-log";

const createdInstitutionIds: string[] = [];

async function makeInstitution() {
  const institution = await prisma.institution.create({
    data: { name: "Audit Test Institution", code: `audit-test-${Date.now()}-${Math.random()}` },
  });
  createdInstitutionIds.push(institution.id);
  return institution;
}

describe("recordAuditEvent", () => {
  afterEach(async () => {
    await prisma.auditLog.deleteMany({ where: { institutionId: { in: createdInstitutionIds } } });
  });

  afterAll(async () => {
    await prisma.institution.deleteMany({ where: { id: { in: createdInstitutionIds } } });
    await prisma.$disconnect();
  });

  it("writes an audit row with the provided action, outcome, and scope", async () => {
    const institution = await makeInstitution();

    await recordAuditEvent({
      institutionId: institution.id,
      action: "institution_user_created",
      outcome: "success",
      metadata: { role: "incarcerated-user" },
    });

    const rows = await prisma.auditLog.findMany({ where: { institutionId: institution.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe("institution_user_created");
    expect(rows[0].outcome).toBe("SUCCESS");
    expect(rows[0].metadata).toMatchObject({ role: "incarcerated-user" });
  });

  it("maps a failure outcome correctly", async () => {
    const institution = await makeInstitution();

    await recordAuditEvent({
      institutionId: institution.id,
      action: "first_login_password_rejected",
      outcome: "failure",
    });

    const rows = await prisma.auditLog.findMany({ where: { institutionId: institution.id } });
    expect(rows[0].outcome).toBe("FAILURE");
  });

  it("never persists a password, password hash, or case description even if a caller mistakenly includes one in metadata", async () => {
    const institution = await makeInstitution();

    await recordAuditEvent({
      institutionId: institution.id,
      action: "institution_user_created",
      outcome: "success",
      metadata: {
        role: "incarcerated-user",
        password: "hunter2",
        passwordHash: "abc123hash",
        description: "the user's full private case narrative",
      },
    });

    const rows = await prisma.auditLog.findMany({ where: { institutionId: institution.id } });
    const metadata = rows[0].metadata as Record<string, unknown>;
    expect(metadata.role).toBe("incarcerated-user");
    expect(metadata.password).toBe("[REDACTED]");
    expect(metadata.passwordHash).toBe("[REDACTED]");
    expect(metadata.description).toBe("[REDACTED]");
  });

  it("supports actor and target user references", async () => {
    const institution = await makeInstitution();
    const actor = await prisma.user.create({
      data: { clerkUserId: `clerk-actor-${Date.now()}`, role: "INSTITUTION_ADMIN", institutionId: institution.id },
    });
    const target = await prisma.user.create({
      data: {
        clerkUserId: `clerk-target-${Date.now()}`,
        role: "INCARCERATED_USER",
        institutionId: institution.id,
        mustChangePassword: true,
      },
    });

    await recordAuditEvent({
      institutionId: institution.id,
      actorUserId: actor.id,
      targetUserId: target.id,
      action: "institution_user_created",
      outcome: "success",
    });

    const rows = await prisma.auditLog.findMany({ where: { institutionId: institution.id } });
    expect(rows[0].actorUserId).toBe(actor.id);
    expect(rows[0].targetUserId).toBe(target.id);

    await prisma.user.deleteMany({ where: { id: { in: [actor.id, target.id] } } });
  });
});
