import { prisma } from "@/lib/db";

export interface RecentLoginEntry {
  userId: string;
  label: string;
  lastLoginAt: Date;
}

export interface InstitutionSystemNotice {
  id: string;
  message: string;
  severity: "info" | "warning";
}

export interface InstitutionDashboardOverview {
  institutionName: string;
  totalManagedAccounts: number;
  activeUsers: number;
  pendingInvitations: number;
  archivedAccounts: number;
  intakesStarted: number;
  roadmapsGenerated: number;
  recentLogins: RecentLoginEntry[];
  systemNotices: InstitutionSystemNotice[];
}

const RECENT_LOGINS_LIMIT = 5;

/**
 * Aggregate-only — this must never surface a participant's private
 * research content, only counts and account metadata. See
 * docs/behavior/shared-device-privacy.md and
 * docs/behavior/institutional-accounts.md. `institutionId` is always the
 * acting staff member's own — never accept this from client input.
 */
export async function getInstitutionDashboardOverview(institutionId: string): Promise<InstitutionDashboardOverview> {
  const [institution, totalManagedAccounts, activeUsers, pendingInvitations, archivedAccounts, intakesStarted, roadmapsGenerated, recentLoginUsers] =
    await Promise.all([
      prisma.institution.findUnique({ where: { id: institutionId } }),
      prisma.user.count({ where: { institutionId } }),
      prisma.user.count({ where: { institutionId, accountStatus: "ACTIVE" } }),
      prisma.user.count({ where: { institutionId, accountStatus: "PENDING_FIRST_LOGIN" } }),
      prisma.user.count({ where: { institutionId, accountStatus: "ARCHIVED" } }),
      prisma.intakeSession.count({ where: { institutionId } }),
      prisma.researchRoadmap.count({ where: { institutionId } }),
      prisma.user.findMany({
        where: { institutionId, lastLoginAt: { not: null } },
        orderBy: { lastLoginAt: "desc" },
        take: RECENT_LOGINS_LIMIT,
        select: { id: true, username: true, displayName: true, lastLoginAt: true },
      }),
    ]);

  const recentLogins: RecentLoginEntry[] = recentLoginUsers
    .filter((user) => user.lastLoginAt !== null)
    .map((user) => ({
      userId: user.id,
      label: user.displayName ?? user.username ?? "Unnamed account",
      lastLoginAt: user.lastLoginAt as Date,
    }));

  const systemNotices: InstitutionSystemNotice[] = [];
  if (institution && !institution.active) {
    systemNotices.push({
      id: "institution-inactive",
      message: "This institution is currently marked inactive. Contact CaseCompass support if this is unexpected.",
      severity: "warning",
    });
  }
  if (pendingInvitations > 0) {
    systemNotices.push({
      id: "pending-first-login",
      message: `${pendingInvitations} account${pendingInvitations === 1 ? "" : "s"} ${pendingInvitations === 1 ? "has" : "have"} not completed first login yet.`,
      severity: "info",
    });
  }

  return {
    institutionName: institution?.name ?? "Institution",
    totalManagedAccounts,
    activeUsers,
    pendingInvitations,
    archivedAccounts,
    intakesStarted,
    roadmapsGenerated,
    recentLogins,
    systemNotices,
  };
}
