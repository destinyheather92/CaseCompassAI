import Link from "next/link";
import type { UserRoadmapSummary } from "@/lib/dashboard/get-user-roadmaps";

export function RoadmapProgressCard({ roadmap }: { roadmap: UserRoadmapSummary }) {
  const percent = roadmap.totalSteps === 0 ? 0 : Math.round((roadmap.completedSteps / roadmap.totalSteps) * 100);

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Roadmap Progress</h2>
        <Link href={`/dashboard/roadmaps/${roadmap.id}`} className="text-xs font-medium text-cc-purple hover:underline">
          View roadmap
        </Link>
      </div>
      <p className="mt-3 text-base font-bold text-cc-text">{roadmap.title}</p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-full rounded-full bg-gradient-to-r from-cc-purple to-cc-teal transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-cc-muted">
        {roadmap.completedSteps} of {roadmap.totalSteps} steps completed
      </p>
    </div>
  );
}
