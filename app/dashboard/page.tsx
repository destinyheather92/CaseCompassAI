import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireDashboardAccess } from "@/lib/auth/dashboard-authorization";
import { getDashboardOverview } from "@/lib/dashboard/get-dashboard-overview";
import { getDashboardCasesPreview } from "@/lib/dashboard/get-dashboard-cases-preview";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { VerifiedCasesPreview } from "@/components/dashboard/verified-cases-preview";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import { ResearchStatusCard } from "@/components/dashboard/research-status-card";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { IntakeSummaryCard } from "@/components/dashboard/intake-summary-card";
import { IntakeTimeline } from "@/components/dashboard/intake-timeline";
import { UnresolvedQuestionsCard } from "@/components/dashboard/unresolved-questions-card";
import { RoadmapProgressCard } from "@/components/dashboard/roadmap-progress-card";
import { LegalTermsCard } from "@/components/dashboard/legal-terms-card";
import { RecommendedResources } from "@/components/dashboard/recommended-resources";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export const metadata: Metadata = {
  title: "Dashboard | CaseCompass AI",
};

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const authResult = await requireDashboardAccess();
  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  const overview = await getDashboardOverview(authResult.user.id);
  const { saved } = await searchParams;
  const casesPreview = overview.activeRoadmap ? await getDashboardCasesPreview(overview.activeRoadmap.id) : [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {saved === "intake" && (
        <div role="status" aria-live="polite" className="glass-card rounded-xl border border-cc-teal/40 p-3 text-sm text-cc-text">
          Your intake progress has been saved.
        </div>
      )}
      <WelcomeHeader />
      <ResearchStatusCard researchStatus={overview.researchStatus} primaryAction={overview.primaryAction} />

      {overview.activeIntake === null ? (
        <DashboardEmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <IntakeSummaryCard intake={overview.activeIntake} />
          </div>
          {overview.activeRoadmap && <RoadmapProgressCard roadmap={overview.activeRoadmap} />}
          {overview.activeRoadmap && <VerifiedCasesPreview roadmapId={overview.activeRoadmap.id} cases={casesPreview} />}
          <UnresolvedQuestionsCard unresolvedInformation={overview.unresolvedInformation} />
          <IntakeTimeline timeline={overview.timeline} />
          <LegalTermsCard legalTerms={overview.legalTerms} />
          <RecommendedResources resources={overview.recommendedResources} />
          <div className="lg:col-span-2">
            <RecentActivity activity={overview.recentActivity} />
          </div>
        </div>
      )}

      <DashboardDisclaimer disclaimer={overview.disclaimer} />
    </div>
  );
}
