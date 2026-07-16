import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { generateTemporaryPassword, generateUsername } from "@/lib/auth/generate-credentials";
import { mapApiRoleToPrismaRole, type AssignableApiRole } from "@/lib/institution/institution-schema";
import { recordAuditEvent } from "@/lib/security/audit-log";

const TEMPORARY_PASSWORD_VALID_DAYS = 14;
const MAX_USERNAME_GENERATION_ATTEMPTS = 5;

export interface ClerkUserCreationInput {
  username: string;
  password: string;
}
export interface ClerkUserCreationResult {
  clerkUserId: string;
}
/** Injectable so tests never call the live Clerk API — see the default implementation below for the real one. */
export type ClerkUserCreator = (input: ClerkUserCreationInput) => Promise<ClerkUserCreationResult>;

async function defaultClerkUserCreator(input: ClerkUserCreationInput): Promise<ClerkUserCreationResult> {
  const client = await clerkClient();
  const user = await client.users.createUser({
    username: input.username,
    password: input.password,
    skipPasswordChecks: false,
  });
  return { clerkUserId: user.id };
}

export interface CreateInstitutionUserInput {
  /** Prisma User.id of the already-authorized institution-admin performing this action. */
  actorUserId: string;
  /** Derived server-side from the actor's own AppUser — never accept this from client input. */
  institutionId: string;
  role: AssignableApiRole;
  username?: string;
  displayName?: string;
  facilityId?: string;
  internalIdentifier?: string;
}

export interface CreatedInstitutionUser {
  id: string;
  username: string;
  role: string;
  accountStatus: string;
}

export type CreateInstitutionUserResult =
  | { status: "created"; user: CreatedInstitutionUser; temporaryPassword: string }
  | { status: "invalid-role" }
  | { status: "invalid-facility" }
  | { status: "username-taken" }
  | { status: "error"; message: string };

export interface CreateInstitutionUserDeps {
  clerkUserCreator?: ClerkUserCreator;
}

const ASSIGNABLE_ROLES = new Set<AssignableApiRole>(["incarcerated-user", "educator", "legal-aid-staff"]);

/**
 * Provisions an institution-managed account: a Clerk identity with only a
 * username + system-generated (or staff-supplied) password — never an
 * email or phone — plus the Prisma authorization row, pending first
 * login. See docs/behavior/institutional-accounts.md.
 */
export async function createInstitutionUser(
  input: CreateInstitutionUserInput,
  deps: CreateInstitutionUserDeps = {},
): Promise<CreateInstitutionUserResult> {
  const clerkUserCreator = deps.clerkUserCreator ?? defaultClerkUserCreator;

  if (!ASSIGNABLE_ROLES.has(input.role)) {
    return { status: "invalid-role" };
  }

  const institution = await prisma.institution.findUnique({ where: { id: input.institutionId } });
  if (!institution) {
    return { status: "error", message: "Institution not found." };
  }

  let facilityCode: string | null = null;
  if (input.facilityId) {
    const facility = await prisma.facility.findUnique({ where: { id: input.facilityId } });
    if (!facility || facility.institutionId !== input.institutionId) {
      return { status: "invalid-facility" };
    }
    facilityCode = facility.code;
  }

  let username = input.username;
  if (username) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return { status: "username-taken" };
    }
  } else {
    for (let attempt = 0; attempt < MAX_USERNAME_GENERATION_ATTEMPTS; attempt++) {
      const candidate = generateUsername(facilityCode ?? institution.code);
      const existing = await prisma.user.findUnique({ where: { username: candidate } });
      if (!existing) {
        username = candidate;
        break;
      }
    }
    if (!username) {
      return { status: "error", message: "Could not generate a unique username. Please try again." };
    }
  }

  const temporaryPassword = generateTemporaryPassword();

  let clerkResult: ClerkUserCreationResult;
  try {
    clerkResult = await clerkUserCreator({ username, password: temporaryPassword });
  } catch {
    await recordAuditEvent({
      actorUserId: input.actorUserId,
      institutionId: input.institutionId,
      facilityId: input.facilityId,
      action: "institution_user_creation_rejected",
      outcome: "failure",
      metadata: { reason: "identity_provider_error" },
    });
    return { status: "error", message: "Could not create the account. Please try again." };
  }

  const temporaryPasswordExpiresAt = new Date(Date.now() + TEMPORARY_PASSWORD_VALID_DAYS * 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      clerkUserId: clerkResult.clerkUserId,
      role: mapApiRoleToPrismaRole(input.role),
      accountStatus: "PENDING_FIRST_LOGIN",
      username,
      displayName: input.displayName,
      internalIdentifier: input.internalIdentifier,
      institutionId: input.institutionId,
      facilityId: input.facilityId,
      mustChangePassword: true,
      temporaryPasswordExpiresAt,
      createdById: input.actorUserId,
    },
  });

  await recordAuditEvent({
    actorUserId: input.actorUserId,
    targetUserId: user.id,
    institutionId: input.institutionId,
    facilityId: input.facilityId,
    action: "institution_user_created",
    outcome: "success",
    metadata: { role: input.role },
  });

  return {
    status: "created",
    user: { id: user.id, username: user.username!, role: user.role, accountStatus: user.accountStatus },
    temporaryPassword,
  };
}
