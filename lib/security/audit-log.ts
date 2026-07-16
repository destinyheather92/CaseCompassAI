import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { redact } from "@/lib/security/safe-logger";

export interface AuditEventInput {
  actorUserId?: string | null;
  institutionId?: string | null;
  facilityId?: string | null;
  targetUserId?: string | null;
  action: string;
  outcome: "success" | "failure";
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Writes a structured audit event. `metadata` is passed through the same
 * redaction guard as `safeLog` before it's persisted, so a caller that
 * accidentally includes a password, hash, or case description can never
 * get it written to the audit trail — see docs/behavior/audit-events.md.
 */
export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  const redactedMetadata = input.metadata ? (redact(input.metadata) as Prisma.InputJsonValue) : undefined;

  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? undefined,
      institutionId: input.institutionId ?? undefined,
      facilityId: input.facilityId ?? undefined,
      targetUserId: input.targetUserId ?? undefined,
      action: input.action,
      outcome: input.outcome === "success" ? "SUCCESS" : "FAILURE",
      metadata: redactedMetadata,
    },
  });
}
