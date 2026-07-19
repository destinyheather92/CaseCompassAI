import type { IntakeTimelineItem } from "@/lib/dashboard/timeline-mapper";

/** Every entry here is built only from what the user typed — see lib/dashboard/timeline-mapper.ts. Nothing is inferred or guessed. */
export function IntakeTimeline({ timeline }: { timeline: IntakeTimelineItem[] }) {
  if (timeline.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Timeline</h2>
      <ol className="mt-4 flex flex-col gap-4">
        {timeline.map((item) => (
          <li key={item.id} className="flex gap-3 border-l-2 border-cc-purple/40 pl-4">
            <div>
              <p className="text-xs font-semibold text-cc-teal">
                {item.dateLabel}
                {item.isApproximate && <span className="ml-1 text-cc-muted">(approximate)</span>}
              </p>
              <p className="mt-0.5 text-sm font-medium text-cc-text">{item.title}</p>
              <p className="text-xs text-cc-muted">{item.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
