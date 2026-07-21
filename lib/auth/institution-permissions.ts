import type { UserRole } from "@/lib/generated/prisma/enums";

/**
 * The institution administration role — manages inmate/managed-user
 * accounts (create, disable, archive, reset password, view, search) and
 * the institution's own settings. This is the shared gate for
 * /institution/dashboard, /institution/users, and their API routes.
 * There is deliberately only one institution-side role: no staff
 * directory, invitations, or staff-specific permissions.
 */
export const INSTITUTION_MANAGEMENT_ROLES: UserRole[] = ["INSTITUTION_ADMIN"];

/**
 * Institution administration accounts manage an institution and its
 * inmates — they are never themselves the subject of a legal research
 * roadmap. Used both to route them away from the intake/roadmap flow
 * after login and to reject them server-side as an intake/roadmap
 * owner, since a client can't be trusted to simply never call that API.
 */
export function isInstitutionAdministrationRole(role: UserRole): boolean {
  return INSTITUTION_MANAGEMENT_ROLES.includes(role);
}
