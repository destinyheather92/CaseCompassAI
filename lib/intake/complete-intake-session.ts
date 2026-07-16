import { prisma } from "@/lib/db";
import { checkIntakeSessionAccess } from "@/lib/intake/intake-access";
import { recordAuditEvent } from "@/lib/security/audit-log";
import type { AppUser } from "@/lib/auth/authorization";

export type CompleteIntakeSessionResult =
  | { status: "completed"; sessionId: string }
  | { status: "not-found" }
  | { status: "forbidden" }
  | { status: "not-ready"; message: string }
  | { status: "acknowledgement-required"; message: string };

/**
 * Transitions a session from ready-for-review to completed. Requires
 * explicit acknowledgement — roadmap generation (a separate system) must
 * never be triggered by the AI reaching intake-complete on its own; only
 * the user confirming the reviewed summary can do that.
 */
export async function completeIntakeSession(
  sessionId: string,
  acknowledged: boolean,
  actorUser: AppUser | null,
): Promise<CompleteIntakeSessionResult> {
  const session = await prisma.intakeSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return { status: "not-found" };
  }

  const access = checkIntakeSessionAccess({ userId: session.userId }, actorUser);
  if (!access.ok) {
    return { status: "forbidden" };
  }

  if (session.status !== "READY_FOR_REVIEW") {
    return { status: "not-ready", message: "This intake session isn't ready to be completed yet." };
  }

  if (!acknowledged) {
    return {
      status: "acknowledgement-required",
      message: "Please confirm that this summary reflects the information you provided.",
    };
  }

  await prisma.intakeSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await recordAuditEvent({
    actorUserId: actorUser?.id ?? null,
    institutionId: session.institutionId,
    facilityId: session.facilityId,
    action: "intake_interview_completed",
    outcome: "success",
  });

  return { status: "completed", sessionId };
}
