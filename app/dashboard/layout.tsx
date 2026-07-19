import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireDashboardAccess } from "@/lib/auth/dashboard-authorization";
import { getDashboardNavContext } from "@/lib/dashboard/get-dashboard-nav-context";
import { postLogoutRedirectFor } from "@/lib/auth/post-logout-redirect";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

/**
 * proxy.ts gates `/dashboard(.*)` as a coarse first pass, but this layout
 * independently re-checks the authenticated user against Prisma — proxy
 * matcher coverage is never treated as sufficient on its own. See
 * docs/behavior/security-invariants.md.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const authResult = await requireDashboardAccess();
  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  const navContext = await getDashboardNavContext(authResult.user.id);

  return (
    <DashboardShell navContext={navContext} postLogoutRedirect={postLogoutRedirectFor(authResult.user.role)}>
      {children}
    </DashboardShell>
  );
}
