import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { INSTITUTION_MANAGEMENT_ROLES } from "@/lib/auth/institution-permissions";
import { UserManagement } from "@/components/institution/user-management";

export const metadata: Metadata = {
  title: "Institution Users | CaseCompass AI",
};

export default async function InstitutionUsersPage() {
  const authResult = await requireAuthenticatedUser({ roles: INSTITUTION_MANAGEMENT_ROLES });

  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <UserManagement />
    </div>
  );
}
