import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Info } from "lucide-react";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { INSTITUTION_MANAGEMENT_ROLES } from "@/lib/auth/institution-permissions";
import { getInstitutionDashboardOverview } from "@/lib/institution/get-institution-dashboard-overview";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Institution Dashboard | CaseCompass AI",
};

/**
 * Deliberately aggregate-only. This page must never surface a
 * participant's private research content — see
 * docs/behavior/shared-device-privacy.md and
 * docs/behavior/institutional-accounts.md.
 */
export default async function InstitutionDashboardPage() {
  const authResult = await requireAuthenticatedUser({ roles: INSTITUTION_MANAGEMENT_ROLES });

  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  const institutionId = authResult.user.institutionId;
  if (!institutionId) {
    redirect("/institution/login");
  }

  const overview = await getInstitutionDashboardOverview(institutionId);

  const stats = [
    { label: "Total Accounts", value: overview.totalManagedAccounts },
    { label: "Active Users", value: overview.activeUsers },
    { label: "Pending Invitations", value: overview.pendingInvitations },
    { label: "Archived", value: overview.archivedAccounts },
    { label: "Intakes Started", value: overview.intakesStarted },
    { label: "Roadmaps Generated", value: overview.roadmapsGenerated },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-cc-text">{overview.institutionName}</h1>
          <p className="mt-1 text-sm text-cc-muted">Account status and usage overview. No private research content is shown here.</p>
        </div>
        <Link href="/institution/users" className={buttonVariants({ variant: "default" })}>
          Manage Users
        </Link>
      </div>

      {overview.systemNotices.length > 0 && (
        <div className="flex flex-col gap-2">
          {overview.systemNotices.map((notice) => (
            <div
              key={notice.id}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
                notice.severity === "warning"
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                  : "border-cc-purple/30 bg-cc-purple/10 text-cc-text"
              }`}
            >
              {notice.severity === "warning" ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              ) : (
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              )}
              <p>{notice.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-6">
            <p className="text-3xl font-bold text-cc-text">{stat.value}</p>
            <p className="mt-1 text-sm text-cc-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Recent Logins</h2>
        {overview.recentLogins.length === 0 ? (
          <p className="mt-4 text-sm text-cc-muted">No logins recorded yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {overview.recentLogins.map((login) => (
              <li key={login.userId} className="flex items-center justify-between text-sm">
                <span className="font-medium text-cc-text">{login.label}</span>
                <span className="text-cc-muted">{new Date(login.lastLoginAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
