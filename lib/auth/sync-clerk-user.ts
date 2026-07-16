import { prisma } from "@/lib/db";

export interface SyncIndividualUserInput {
  clerkUserId: string;
}

/**
 * Ensures a Prisma `User` row exists for a Clerk identity, called from
 * the `user.created` webhook. Individual users self-register through
 * Clerk's existing email/OAuth sign-up, so this is how their
 * authorization row gets created — no client-facing endpoint does it,
 * which means a client can never choose its own role by calling this
 * path directly.
 *
 * Institution-managed users already have their Prisma row created
 * synchronously as part of institution user creation (before Clerk's
 * user.created webhook can arrive), so this is an upsert that no-ops
 * when a row already exists — it must never downgrade or overwrite an
 * institutional user's role, scope, or mustChangePassword state.
 */
export async function syncIndividualUserFromClerk(input: SyncIndividualUserInput) {
  return prisma.user.upsert({
    where: { clerkUserId: input.clerkUserId },
    create: {
      clerkUserId: input.clerkUserId,
      role: "INDIVIDUAL",
      accountStatus: "ACTIVE",
      mustChangePassword: false,
    },
    update: {},
  });
}
