import { z } from "zod";
import type { UserRole } from "@/lib/generated/prisma/enums";

/** Roles institution staff are allowed to assign through this endpoint — never institution-admin or system-admin (invariant #31). */
export const ASSIGNABLE_API_ROLES = ["incarcerated-user", "educator", "legal-aid-staff"] as const;
export type AssignableApiRole = (typeof ASSIGNABLE_API_ROLES)[number];

const API_ROLE_TO_PRISMA_ROLE: Record<AssignableApiRole, UserRole> = {
  "incarcerated-user": "INCARCERATED_USER",
  educator: "EDUCATOR",
  "legal-aid-staff": "LEGAL_AID_STAFF",
};

export function mapApiRoleToPrismaRole(role: AssignableApiRole): UserRole {
  return API_ROLE_TO_PRISMA_ROLE[role];
}

/**
 * Validates a staff-submitted institution user creation request. Any
 * client-supplied `institutionId`/`facilityId`-as-scope-override or role
 * outside the three assignable roles is rejected or stripped here — the
 * server route still independently derives institution scope from the
 * authenticated staff member, never from this payload (invariant #23).
 */
export const institutionUserCreateSchema = z.object({
  role: z.enum(ASSIGNABLE_API_ROLES),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(64, "Username must be 64 characters or fewer.")
    .regex(/^[a-z0-9-]+$/, "Username may only contain lowercase letters, numbers, and hyphens.")
    .optional(),
  temporaryPassword: z
    .string()
    .min(10, "Temporary password must be at least 10 characters.")
    .max(128, "Temporary password must be 128 characters or fewer.")
    .optional(),
  displayName: z.string().trim().max(100).optional(),
  facilityId: z.string().trim().min(1).max(64).optional(),
  internalIdentifier: z.string().trim().max(100).optional(),
});

export type InstitutionUserCreateInput = z.infer<typeof institutionUserCreateSchema>;
