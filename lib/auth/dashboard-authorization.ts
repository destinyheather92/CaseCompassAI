import { prisma } from "@/lib/db";
import { requireAuthenticatedUser, type AppUser, type AuthorizationResult } from "@/lib/auth/authorization";
import type { IntakeSession, ResearchRoadmap, SavedResource, SavedCase } from "@/lib/generated/prisma/client";

/**
 * Any authenticated, active, password-complete user may access their own
 * dashboard — no role restriction, since individual users, incarcerated
 * users, educators, legal-aid staff, and institution staff all have
 * their own personal research to manage. Institutional admin privileges
 * grant no automatic access here — see requireOwned* below.
 */
export async function requireDashboardAccess(): Promise<AuthorizationResult> {
  return requireAuthenticatedUser();
}

export type OwnedResourceResult<T> = { ok: true; resource: T } | { ok: false; reason: "not-found" };

/**
 * Ownership checks deliberately return `not-found` rather than
 * `forbidden` for a resource that exists but belongs to someone else —
 * per the product's own policy, a client shouldn't be able to
 * distinguish "doesn't exist" from "exists but isn't yours" by response
 * shape. Institution staff get no bypass here: private research is
 * owner-only regardless of role.
 */
export async function requireOwnedIntake(
  intakeId: string,
  user: AppUser,
): Promise<OwnedResourceResult<IntakeSession>> {
  const intake = await prisma.intakeSession.findUnique({ where: { id: intakeId } });
  if (!intake || intake.userId !== user.id) {
    return { ok: false, reason: "not-found" };
  }
  return { ok: true, resource: intake };
}

export async function requireOwnedRoadmap(
  roadmapId: string,
  user: AppUser,
): Promise<OwnedResourceResult<ResearchRoadmap>> {
  const roadmap = await prisma.researchRoadmap.findUnique({ where: { id: roadmapId } });
  if (!roadmap || roadmap.userId !== user.id) {
    return { ok: false, reason: "not-found" };
  }
  return { ok: true, resource: roadmap };
}

export async function requireOwnedSavedItem(
  savedItemId: string,
  user: AppUser,
): Promise<OwnedResourceResult<SavedResource>> {
  const item = await prisma.savedResource.findUnique({ where: { id: savedItemId } });
  if (!item || item.userId !== user.id) {
    return { ok: false, reason: "not-found" };
  }
  return { ok: true, resource: item };
}

export async function requireOwnedSavedCase(
  savedCaseId: string,
  user: AppUser,
): Promise<OwnedResourceResult<SavedCase>> {
  const savedCase = await prisma.savedCase.findUnique({ where: { id: savedCaseId } });
  if (!savedCase || savedCase.userId !== user.id) {
    return { ok: false, reason: "not-found" };
  }
  return { ok: true, resource: savedCase };
}
