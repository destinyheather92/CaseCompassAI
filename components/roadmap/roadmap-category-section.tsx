"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { ROADMAP_STEP_CATEGORY_LABELS, type RoadmapStepCategory } from "@/lib/roadmap/roadmap-step-templates";
import type { RoadmapStepStatus } from "@/types/roadmap";

export function RoadmapCategorySection({
  category,
  steps,
  children,
}: {
  category: RoadmapStepCategory;
  steps: { status: RoadmapStepStatus }[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const completed = steps.filter((step) => step.status === "completed").length;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
      >
        <span className="flex items-center gap-2">
          <h2 className="text-xs font-semibold tracking-[0.15em] text-cc-muted uppercase">
            {ROADMAP_STEP_CATEGORY_LABELS[category]}
          </h2>
          <span className="text-xs text-cc-muted">
            ({completed}/{steps.length})
          </span>
        </span>
        <ChevronDown
          className={`size-4 text-cc-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="flex flex-col gap-4">{children}</div>}
    </div>
  );
}
