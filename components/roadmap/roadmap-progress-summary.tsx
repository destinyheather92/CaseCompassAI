import type { RoadmapStepStatus } from "@/types/roadmap";

export function RoadmapProgressSummary({ steps }: { steps: { status: RoadmapStepStatus }[] }) {
  const total = steps.length;
  const completed = steps.filter((step) => step.status === "completed").length;
  const inProgress = steps.filter((step) => step.status === "in-progress").length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-cc-muted uppercase">Overall Progress</p>
        <p className="text-sm font-semibold text-cc-text">{percent}%</p>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall roadmap progress"
          className="h-full rounded-full bg-gradient-to-r from-cc-purple to-cc-teal transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-cc-muted">
        {completed} of {total} steps completed{inProgress > 0 ? ` · ${inProgress} in progress` : ""}
      </p>
    </div>
  );
}
