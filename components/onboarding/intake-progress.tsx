"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntakeStep } from "@/stores/use-intake-store";

const PHASES = [
  { key: "situation", label: "Your Situation", steps: ["case-type", "jurisdiction", "procedural-stage"] },
  { key: "goals", label: "Your Goals", steps: ["research-goals", "document-types"] },
  { key: "questions", label: "Questions", steps: ["ai-interview"] },
  { key: "review", label: "Review", steps: ["review"] },
] as const;

function phaseIndexForStep(step: IntakeStep): number {
  if (step === "welcome") return -1;
  if (step === "complete") return PHASES.length;
  return PHASES.findIndex((phase) => (phase.steps as readonly string[]).includes(step));
}

/** Purely visual — a wrong/missing match just hides the bar rather than throwing, since this never gates navigation. */
export function IntakeProgress({ step }: { step: IntakeStep }) {
  const currentIndex = phaseIndexForStep(step);
  if (currentIndex === -1) return null;

  return (
    <ol aria-label="Intake progress" className="mx-auto flex w-full max-w-xl items-center px-2">
      {PHASES.map((phase, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <li key={phase.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-300",
                  isComplete && "border-cc-purple bg-cc-purple text-white",
                  isCurrent &&
                    "border-cc-purple bg-cc-purple/20 text-cc-purple shadow-[0_0_0_4px_rgba(139,92,246,0.18)]",
                  !isComplete && !isCurrent && "border-white/15 text-cc-muted",
                )}
              >
                {isComplete ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-[0.68rem] font-medium tracking-wide whitespace-nowrap sm:block",
                  isCurrent || isComplete ? "text-cc-text" : "text-cc-muted",
                )}
              >
                {phase.label}
              </span>
            </div>
            {index < PHASES.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-2 h-px flex-1 transition-colors duration-300",
                  isComplete ? "bg-cc-purple" : "bg-white/10",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
