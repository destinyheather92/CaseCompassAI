import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireDashboardAccess } from "@/lib/auth/dashboard-authorization";
import { getRoadmapDetail } from "@/lib/dashboard/get-roadmap-detail";
import { postLogoutRedirectFor } from "@/lib/auth/post-logout-redirect";
import { groupStepsByCategory } from "@/lib/roadmap/group-steps-by-category";
import { buttonVariants } from "@/components/ui/button";
import { RoadmapStepCard } from "@/components/roadmap/roadmap-step-card";
import { RoadmapProgressSummary } from "@/components/roadmap/roadmap-progress-summary";
import { RoadmapCategorySection } from "@/components/roadmap/roadmap-category-section";
import { CasesToResearch } from "@/components/roadmap/cases-to-research";
import { DashboardDisclaimer } from "@/components/dashboard/dashboard-disclaimer";
import { LogOutButton } from "@/components/dashboard/log-out-button";

export const metadata: Metadata = {
  title: "Research Roadmap | CaseCompass AI",
};

export default async function RoadmapDetailPage({ params }: { params: Promise<{ roadmapId: string }> }) {
  const authResult = await requireDashboardAccess();
  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  const { roadmapId } = await params;
  const result = await getRoadmapDetail(roadmapId, authResult.user);
  if (result.status === "not-found") {
    notFound();
  }

  const { roadmap } = result;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Return to Dashboard
        </Link>
        <Link href="/dashboard/research" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Research Cases
        </Link>
        <Link href="/dashboard/saved" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Saved Research
        </Link>
        <LogOutButton postLogoutRedirect={postLogoutRedirectFor(authResult.user.role)} className="ml-auto" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-cc-text">{roadmap.title}</h1>
        <p className="mt-1 text-sm text-cc-muted">{roadmap.summary}</p>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs font-semibold tracking-wide text-cc-muted uppercase">Jurisdiction</p>
        <p className="mt-1 text-sm font-medium text-cc-text">{roadmap.jurisdiction.label}</p>
        <p className="mt-1 text-xs text-cc-muted">{roadmap.jurisdiction.limitationNote}</p>
      </div>

      <RoadmapProgressSummary steps={roadmap.steps} />

      <div className="flex flex-col gap-8">
        {groupStepsByCategory(roadmap.steps.slice().sort((a, b) => a.order - b.order)).map((group) => (
          <RoadmapCategorySection key={group.category} category={group.category} steps={group.steps}>
            {group.steps.map((step) => (
              <RoadmapStepCard key={step.id} roadmapId={roadmap.id} step={step} />
            ))}
          </RoadmapCategorySection>
        ))}
      </div>

      <CasesToResearch roadmapId={roadmap.id} jurisdiction={roadmap.jurisdiction.code} />

      {roadmap.legalTerms.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Legal Terms</h2>
          <dl className="mt-4 flex flex-col gap-3">
            {roadmap.legalTerms.map((term) => (
              <div key={term.term}>
                <dt className="text-sm font-semibold text-cc-text">{term.term}</dt>
                <dd className="text-xs text-cc-muted">{term.plainLanguageDefinition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {roadmap.sourceSuggestions.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Where To Look</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {roadmap.sourceSuggestions.map((source) => (
              <li key={source.name}>
                <p className="text-sm font-medium text-cc-text">{source.name}</p>
                <p className="text-xs text-cc-muted">{source.reasonToReview}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {roadmap.safetyNotes.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Important Notes</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {roadmap.safetyNotes.map((note) => (
              <li key={note} className="text-sm text-cc-muted">
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <DashboardDisclaimer disclaimer={roadmap.disclaimer} />
    </div>
  );
}
