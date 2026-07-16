import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/lib/security/audit-log";

export type ClerkBanSetter = (clerkUserId: string, banned: boolean) => Promise<void>;

async function defaultClerkBanSetter(clerkUserId: string, banned: boolean): Promise<void> {
  const client = await clerkClient();
  if (banned) {
    await client.users.banUser(clerkUserId);
  } else {
    await client.users.unbanUser(clerkUserId);
  }
}

export type UserStatusAction = "deactivate" | "reactivate";

export interface ChangeInstitutionUserStatusInput {
  actorUserId: string;
  institutionId: string;
  targetUserId: string;
  action: UserStatusAction;
}

export type ChangeInstitutionUserStatusResult =
  | { status: "updated"; accountStatus: string }
  | { status: "not-found" }
  | { status: "forbidden-institution" }
  | { status: "error"; message: string };

export interface ChangeInstitutionUserStatusDeps {
  clerkBanSetter?: ClerkBanSetter;
}

/**
 * Deactivation bans the Clerk identity directly (defense in depth,
 * invariant #11/#34) in addition to flipping Prisma's accountStatus, so
 * a missed app-layer check elsewhere can't still let a disabled account
 * authenticate. Reactivation returns the user to PENDING_FIRST_LOGIN
 * rather than ACTIVE if they still owe a password change.
 */
export async function changeInstitutionUserStatus(
  input: ChangeInstitutionUserStatusInput,
  deps: ChangeInstitutionUserStatusDeps = {},
): Promise<ChangeInstitutionUserStatusResult> {
  const clerkBanSetter = deps.clerkBanSetter ?? defaultClerkBanSetter;

  const target = await prisma.user.findUnique({ where: { id: input.targetUserId } });
  if (!target) {
    return { status: "not-found" };
  }
  if (target.institutionId !== input.institutionId) {
    return { status: "forbidden-institution" };
  }

  const banned = input.action === "deactivate";
  try {
    await clerkBanSetter(target.clerkUserId, banned);
  } catch {
    return { status: "error", message: "Could not update the account. Please try again." };
  }

  const accountStatus = banned ? "DISABLED" : target.mustChangePassword ? "PENDING_FIRST_LOGIN" : "ACTIVE";

  await prisma.user.update({ where: { id: target.id }, data: { accountStatus } });

  await recordAuditEvent({
    actorUserId: input.actorUserId,
    targetUserId: target.id,
    institutionId: input.institutionId,
    action: banned ? "account_deactivated" : "account_reactivated",
    outcome: "success",
  });

  return { status: "updated", accountStatus };
}
