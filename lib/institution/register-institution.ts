import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { generateTemporaryPassword, generateUsername } from "@/lib/auth/generate-credentials";
import { recordAuditEvent } from "@/lib/security/audit-log";
import type { RegisterInstitutionInput } from "@/lib/institution/register-institution-schema";
import type { ClerkUserCreator, ClerkUserCreationResult } from "@/lib/institution/create-user";

const TEMPORARY_PASSWORD_VALID_DAYS = 14;
const MAX_CODE_GENERATION_ATTEMPTS = 5;

async function defaultClerkUserCreator(input: { username: string; password: string }): Promise<ClerkUserCreationResult> {
  const client = await clerkClient();
  const user = await client.users.createUser({ username: input.username, password: input.password, skipPasswordChecks: false });
  return { clerkUserId: user.id };
}

function slugify(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? cleaned.slice(0, 40) : "institution";
}

export interface RegisterInstitutionDeps {
  clerkUserCreator?: ClerkUserCreator;
}

export type RegisterInstitutionResult =
  | { status: "registered"; institutionId: string; adminUsername: string; temporaryPassword: string }
  | { status: "error"; message: string };

/**
 * Public, self-service institution registration. Per an explicit product
 * decision, this creates a live, immediately-usable Institution +
 * INSTITUTION_ADMIN account right away (no approval queue) — CaseCompass
 * staff are expected to review new institutions after the fact rather
 * than gating creation on manual approval. This is a second legitimate
 * place (alongside prisma/seed.ts) that creates an INSTITUTION_ADMIN
 * directly — the ordinary lib/institution/create-user.ts staff-facing
 * path still refuses to (invariant #31), since a brand-new institution
 * has no existing staff to perform that action yet.
 *
 * As with every other institution-managed account, the admin
 * authenticates via a system-generated username + temporary password —
 * contactEmail is stored on the Institution as contact information only
 * and is never sent to the identity provider.
 */
export async function registerInstitution(
  input: RegisterInstitutionInput,
  deps: RegisterInstitutionDeps = {},
): Promise<RegisterInstitutionResult> {
  const clerkUserCreator = deps.clerkUserCreator ?? defaultClerkUserCreator;

  let code: string | null = null;
  const baseSlug = slugify(input.facilityName);
  for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
    const candidate = attempt === 0 ? baseSlug : generateUsername(baseSlug);
    const existing = await prisma.institution.findUnique({ where: { code: candidate } });
    if (!existing) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    return { status: "error", message: "Could not generate a unique institution code. Please try again." };
  }

  const username = generateUsername(baseSlug);
  const temporaryPassword = generateTemporaryPassword();

  let clerkResult: ClerkUserCreationResult;
  try {
    clerkResult = await clerkUserCreator({ username, password: temporaryPassword });
  } catch {
    await recordAuditEvent({
      action: "institution_registration_rejected",
      outcome: "failure",
      metadata: { reason: "identity_provider_error" },
    });
    return { status: "error", message: "Could not create the account. Please try again." };
  }

  const temporaryPasswordExpiresAt = new Date(Date.now() + TEMPORARY_PASSWORD_VALID_DAYS * 24 * 60 * 60 * 1000);

  const institution = await prisma.institution.create({
    data: {
      name: input.facilityName,
      code,
      institutionType: input.institutionType,
      institutionTypeOther: input.institutionType === "OTHER" ? input.institutionTypeOther : undefined,
      organizationName: input.organizationName,
      address: input.address,
      contactName: input.contactName,
      contactTitle: input.contactTitle,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      estimatedPopulation: input.estimatedPopulation,
      estimatedUsers: input.estimatedUsers,
    },
  });

  const admin = await prisma.user.create({
    data: {
      clerkUserId: clerkResult.clerkUserId,
      role: "INSTITUTION_ADMIN",
      accountStatus: "PENDING_FIRST_LOGIN",
      username,
      displayName: input.contactName,
      institutionId: institution.id,
      mustChangePassword: true,
      temporaryPasswordExpiresAt,
    },
  });

  await recordAuditEvent({
    actorUserId: admin.id,
    targetUserId: admin.id,
    institutionId: institution.id,
    action: "institution_registered",
    outcome: "success",
    metadata: { institutionName: institution.name },
  });

  return { status: "registered", institutionId: institution.id, adminUsername: username, temporaryPassword };
}
