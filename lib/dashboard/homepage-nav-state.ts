import { getDashboardOverview } from "@/lib/dashboard/get-dashboard-overview";
import type { ResearchStatus } from "@/lib/dashboard/research-status";

export interface HomepageNavState {
  dashboardHref: "/dashboard";
  ctaLabel: "Start Intake" | "Continue Intake" | "Continue Research";
  ctaHref: string;
}

function bucketLabel(status: ResearchStatus): HomepageNavState["ctaLabel"] {
  switch (status) {
    case "not-started":
      return "Start Intake";
    case "intake-in-progress":
    case "ready-for-review":
      return "Continue Intake";
    default:
      return "Continue Research";
  }
}

/**
 * The single server-side resolver behind the homepage header's
 * auth-aware CTA. Reuses getDashboardOverview (the dashboard's own
 * aggregation) rather than recomputing research status separately, so
 * the homepage and the dashboard can never disagree about where a
 * user's research currently stands.
 */
export async function resolveHomepageNavState(userId: string): Promise<HomepageNavState> {
  const overview = await getDashboardOverview(userId);
  return {
    dashboardHref: "/dashboard",
    ctaLabel: bucketLabel(overview.researchStatus),
    ctaHref: overview.primaryAction.href,
  };
}
