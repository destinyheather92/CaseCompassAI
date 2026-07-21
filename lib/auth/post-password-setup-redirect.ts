import { prisma } from "@/lib/db";
import { isInstitutionAdministrationRole } from "@/lib/auth/institution-permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";

export interface PostPasswordSetupUser {
  id: string;
  role: UserRole;
}

/**
 * Resolves where a user lands immediately after completing mandatory
 * first-login password setup — the one hard-coded `/get-started`
 * redirect this used to always return was the root cause of facility
 * administrators being sent into the legal intake flow (see
 * docs/behavior/institutional-accounts.md).
 *
 * Institution administration roles (admin, staff) manage the
 * institution and its inmates; they are never the subject of a legal
 * roadmap, so they always go straight to the institution dashboard,
 * never intake. Incarcerated users go through the same personal
 * intake/roadmap flow as an individual user, routed to wherever their
 * own most recent intake/roadmap has actually gotten to — never sent
 * back into the intake wizard once they've already confirmed an intake
 * or have a roadmap, since /dashboard's own status logic already
 * resolves the correct next step from there.
 *
 * Every other role (INDIVIDUAL, EDUCATOR, LEGAL_AID_STAFF) keeps this
 * function's original behavior — always `/get-started` — unchanged,
 * since no product decision distinguishes them and INDIVIDUAL never
 * reaches this path at all (mustChangePassword is always false for
 * INDIVIDUAL — see security-invariants.md #62).
 */
export async function getPostPasswordSetupRoute(user: PostPasswordSetupUser): Promise<string> {
  if (isInstitutionAdministrationRole(user.role)) {
    return "/institution/dashboard";
  }

  if (user.role === "INCARCERATED_USER") {
    const [roadmap, confirmedIntake] = await Promise.all([
      prisma.researchRoadmap.findFirst({ where: { userId: user.id }, select: { id: true } }),
      prisma.intakeSession.findFirst({
        where: { userId: user.id, status: { in: ["COMPLETED", "READY_FOR_REVIEW"] } },
        select: { id: true },
      }),
    ]);
    if (roadmap || confirmedIntake) {
      return "/dashboard";
    }
    return "/get-started";
  }

  return "/get-started";
}
