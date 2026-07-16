import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/security/audit-log";

export type VerifyPasswordFn = (clerkUserId: string, password: string) => Promise<boolean>;
export type SetPasswordFn = (clerkUserId: string, password: string) => Promise<void>;

async function defaultVerifyPassword(clerkUserId: string, password: string): Promise<boolean> {
  const client = await clerkClient();
  try {
    const result = await client.users.verifyPassword({ userId: clerkUserId, password });
    return result.verified === true;
  } catch {
    return false;
  }
}

async function defaultSetPassword(clerkUserId: string, password: string): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUser(clerkUserId, { password, skipPasswordChecks: false });
}

export interface CompleteFirstLoginInput {
  appUserId: string;
  clerkUserId: string;
  mustChangePassword: boolean;
  currentPassword: string;
  newPassword: string;
}

export type CompleteFirstLoginResult =
  | { status: "changed" }
  | { status: "not-required" }
  | { status: "incorrect-current-password" }
  | { status: "error"; message: string };

export interface CompleteFirstLoginDeps {
  verifyPassword?: VerifyPasswordFn;
  setPassword?: SetPasswordFn;
}

/**
 * The server — not the client — is the one that verifies the temporary
 * password (via Clerk's Backend API `verifyPassword`) before ever
 * touching the account. This means a caller can't flip
 * `mustChangePassword` to false just by hitting this endpoint; they must
 * actually prove they know the current credential. See
 * docs/behavior/first-login-password-change.md.
 */
export async function completeFirstLogin(
  input: CompleteFirstLoginInput,
  deps: CompleteFirstLoginDeps = {},
): Promise<CompleteFirstLoginResult> {
  const verifyPassword = deps.verifyPassword ?? defaultVerifyPassword;
  const setPassword = deps.setPassword ?? defaultSetPassword;

  if (!input.mustChangePassword) {
    return { status: "not-required" };
  }

  const isCorrect = await verifyPassword(input.clerkUserId, input.currentPassword);
  if (!isCorrect) {
    await recordAuditEvent({
      actorUserId: input.appUserId,
      targetUserId: input.appUserId,
      action: "first_login_password_rejected",
      outcome: "failure",
    });
    return { status: "incorrect-current-password" };
  }

  try {
    await setPassword(input.clerkUserId, input.newPassword);
  } catch {
    return { status: "error", message: "Could not update your password. Please try again." };
  }

  await prisma.user.update({
    where: { id: input.appUserId },
    data: {
      mustChangePassword: false,
      accountStatus: "ACTIVE",
      passwordChangedAt: new Date(),
      temporaryPasswordExpiresAt: null,
    },
  });

  await recordAuditEvent({
    actorUserId: input.appUserId,
    targetUserId: input.appUserId,
    action: "first_login_password_completed",
    outcome: "success",
  });

  return { status: "changed" };
}
