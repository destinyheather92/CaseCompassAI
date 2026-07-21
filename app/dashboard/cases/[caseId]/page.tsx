import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireDashboardAccess } from "@/lib/auth/dashboard-authorization";
import { postLogoutRedirectFor } from "@/lib/auth/post-logout-redirect";
import { buttonVariants } from "@/components/ui/button";
import { LogOutButton } from "@/components/dashboard/log-out-button";
import { CaseDetailView } from "@/components/case-explainer/case-detail-view";

export const metadata: Metadata = {
  title: "Case Detail | CaseCompass AI",
};

export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const authResult = await requireDashboardAccess();
  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  const { caseId } = await params;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Return to Dashboard
        </Link>
        <Link href="/dashboard/research" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Research Cases
        </Link>
        <LogOutButton postLogoutRedirect={postLogoutRedirectFor(authResult.user.role)} className="ml-auto" />
      </div>

      <CaseDetailView caseId={caseId} />
    </div>
  );
}
