import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireDashboardAccess } from "@/lib/auth/dashboard-authorization";
import { getUserIntakes } from "@/lib/dashboard/get-user-intakes";
import { getUserRoadmaps } from "@/lib/dashboard/get-user-roadmaps";
import { IntakeSummaryCard } from "@/components/dashboard/intake-summary-card";
import { RoadmapProgressCard } from "@/components/dashboard/roadmap-progress-card";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";

export const metadata: Metadata = {
  title: "My Research | CaseCompass AI",
};

export default async function ResearchHistoryPage() {
  const authResult = await requireDashboardAccess();
  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  const [intakes, roadmaps] = await Promise.all([
    getUserIntakes(authResult.user.id),
    getUserRoadmaps(authResult.user.id),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-cc-text">My Research</h1>
        <p className="mt-1 text-sm text-cc-muted">Every intake and roadmap you&apos;ve started. Only visible to you.</p>
      </div>

      {intakes.length === 0 && roadmaps.length === 0 ? (
        <DashboardEmptyState />
      ) : (
        <>
          {roadmaps.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Roadmaps</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {roadmaps.map((roadmap) => (
                  <RoadmapProgressCard key={roadmap.id} roadmap={roadmap} />
                ))}
              </div>
            </div>
          )}

          {intakes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Intakes</h2>
              <div className="mt-4 flex flex-col gap-4">
                {intakes.map((intake) => (
                  <IntakeSummaryCard key={intake.id} intake={intake} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
