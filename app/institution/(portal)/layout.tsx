import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { INSTITUTION_MANAGEMENT_ROLES } from "@/lib/auth/institution-permissions";
import { prisma } from "@/lib/db";
import { InstitutionShell } from "@/components/institution/institution-shell";

/**
 * proxy.ts gates `/institution/dashboard(.*)` and `/institution/users(.*)`
 * as a coarse first pass, but this layout independently re-checks the
 * authenticated user against Prisma — proxy matcher coverage is never
 * treated as sufficient on its own. /institution/login and
 * /institution/register are intentionally outside this layout (they must
 * stay reachable by signed-out visitors).
 */
export default async function InstitutionLayout({ children }: { children: ReactNode }) {
  const authResult = await requireAuthenticatedUser({ roles: INSTITUTION_MANAGEMENT_ROLES });
  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }
  if (!authResult.user.institutionId) {
    redirect("/institution/login");
  }

  const institution = await prisma.institution.findUnique({ where: { id: authResult.user.institutionId } });

  return (
    <InstitutionShell institutionName={institution?.name ?? "Institution"}>
      {children}
    </InstitutionShell>
  );
}
