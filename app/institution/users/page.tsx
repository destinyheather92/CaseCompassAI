import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { UserManagement } from "@/components/institution/user-management";

export const metadata: Metadata = {
  title: "Institution Users | CaseCompass AI",
};

export default async function InstitutionUsersPage() {
  const authResult = await requireAuthenticatedUser({ roles: ["INSTITUTION_ADMIN"] });

  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  return (
    <div className="min-h-screen bg-cc-bg px-6 py-12 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <UserManagement />
      </div>
    </div>
  );
}
