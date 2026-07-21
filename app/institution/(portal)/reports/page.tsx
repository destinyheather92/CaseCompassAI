import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { INSTITUTION_MANAGEMENT_ROLES } from "@/lib/auth/institution-permissions";
import { getInstitutionDashboardOverview } from "@/lib/institution/get-institution-dashboard-overview";

export const metadata: Metadata = {
  title: "Institution Reports | CaseCompass AI",
};

/**
 * A first, honest cut of reporting: the same aggregate counts as the
 * dashboard, laid out for a printable/at-a-glance summary. No per-user
 * research detail — see docs/behavior/shared-device-privacy.md.
 */
export default async function InstitutionReportsPage() {
  const authResult = await requireAuthenticatedUser({ roles: INSTITUTION_MANAGEMENT_ROLES });
  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }
  if (!authResult.user.institutionId) {
    redirect("/institution/login");
  }

  const overview = await getInstitutionDashboardOverview(authResult.user.institutionId);

  const rows = [
    { label: "Total managed accounts", value: overview.totalManagedAccounts },
    { label: "Active users", value: overview.activeUsers },
    { label: "Pending first login", value: overview.pendingInvitations },
    { label: "Archived accounts", value: overview.archivedAccounts },
    { label: "Intake sessions started", value: overview.intakesStarted },
    { label: "Roadmaps generated", value: overview.roadmapsGenerated },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-cc-text">Reports</h1>
        <p className="mt-1 text-sm text-cc-muted">
          Aggregate activity for {overview.institutionName}, as of {new Date().toLocaleDateString()}.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <dl className="flex flex-col divide-y divide-white/[0.06]">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-3">
              <dt className="text-sm text-cc-muted">{row.label}</dt>
              <dd className="text-lg font-semibold text-cc-text">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="text-xs text-cc-muted">
        More detailed reporting (research activity trends, per-facility breakdowns) is planned for a future release.
      </p>
    </div>
  );
}
