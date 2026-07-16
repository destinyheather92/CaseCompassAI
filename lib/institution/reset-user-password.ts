import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { generateTemporaryPassword } from "@/lib/auth/generate-credentials";
import { recordAuditEvent } from "@/lib/security/audit-log";

const TEMPORARY_PASSWORD_VALID_DAYS = 14;

export type ClerkPasswordSetter = (clerkUserId: string, password: string) => Promise<void>;

async function defaultClerkPasswordSetter(clerkUserId: string, password: string): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUser(clerkUserId, { password, skipPasswordChecks: false });
}

export interface ResetInstitutionUserPasswordInput {
  actorUserId: string;
  /** Derived server-side from the acting staff member — never client input. */
  institutionId: string;
  targetUserId: string;
}

export type ResetInstitutionUserPasswordResult =
  | { status: "reset"; temporaryPassword: string }
  | { status: "not-found" }
  | { status: "forbidden-institution" }
  | { status: "error"; message: string };

export interface ResetInstitutionUserPasswordDeps {
  clerkPasswordSetter?: ClerkPasswordSetter;
}

/**
 * Because institution-managed users have no email, there is no
 * "forgot password" flow — only an authorized staff member resetting the
 * credential. Overwriting the Clerk password immediately invalidates the
 * previous one (invariant #28); the account is put back into
 * PENDING_FIRST_LOGIN so the new temporary password forces a private
 * password change on next login.
 */
export async function resetInstitutionUserPassword(
  input: ResetInstitutionUserPasswordInput,
  deps: ResetInstitutionUserPasswordDeps = {},
): Promise<ResetInstitutionUserPasswordResult> {
  const clerkPasswordSetter = deps.clerkPasswordSetter ?? defaultClerkPasswordSetter;

  const target = await prisma.user.findUnique({ where: { id: input.targetUserId } });
  if (!target) {
    return { status: "not-found" };
  }
  if (target.institutionId !== input.institutionId) {
    return { status: "forbidden-institution" };
  }

  const temporaryPassword = generateTemporaryPassword();

  try {
    await clerkPasswordSetter(target.clerkUserId, temporaryPassword);
  } catch {
    await recordAuditEvent({
      actorUserId: input.actorUserId,
      targetUserId: target.id,
      institutionId: input.institutionId,
      action: "temporary_password_reset_rejected",
      outcome: "failure",
      metadata: { reason: "identity_provider_error" },
    });
    return { status: "error", message: "Could not reset the password. Please try again." };
  }

  const temporaryPasswordExpiresAt = new Date(Date.now() + TEMPORARY_PASSWORD_VALID_DAYS * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: target.id },
    data: {
      mustChangePassword: true,
      accountStatus: "PENDING_FIRST_LOGIN",
      temporaryPasswordExpiresAt,
    },
  });

  await recordAuditEvent({
    actorUserId: input.actorUserId,
    targetUserId: target.id,
    institutionId: input.institutionId,
    action: "temporary_password_reset",
    outcome: "success",
  });

  return { status: "reset", temporaryPassword };
}
