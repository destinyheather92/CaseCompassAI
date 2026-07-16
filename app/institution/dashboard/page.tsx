import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db";
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
  const authResult = await requireAuthenticatedUser({ roles: ["INSTITUTION_ADMIN"] });

  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  const institutionId = authResult.user.institutionId;
  if (!institutionId) {
    redirect("/institution/login");
  }

  const [institution, total, pendingFirstLogin, active, disabled] = await Promise.all([
    prisma.institution.findUnique({ where: { id: institutionId } }),
    prisma.user.count({ where: { institutionId } }),
    prisma.user.count({ where: { institutionId, accountStatus: "PENDING_FIRST_LOGIN" } }),
    prisma.user.count({ where: { institutionId, accountStatus: "ACTIVE" } }),
    prisma.user.count({ where: { institutionId, accountStatus: "DISABLED" } }),
  ]);

  const stats = [
    { label: "Total Users", value: total },
    { label: "Active", value: active },
    { label: "Pending First Login", value: pendingFirstLogin },
    { label: "Deactivated", value: disabled },
  ];

  return (
    <div className="min-h-screen bg-cc-bg px-6 py-12 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cc-text">{institution?.name ?? "Institution Dashboard"}</h1>
            <p className="mt-1 text-sm text-cc-muted">Account status and usage overview. No private research content is shown here.</p>
          </div>
          <Link href="/institution/users" className={buttonVariants({ variant: "default" })}>
            Manage Users
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl p-6">
              <p className="text-3xl font-bold text-cc-text">{stat.value}</p>
              <p className="mt-1 text-sm text-cc-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
