"use client";

import { useEffect, useState } from "react";
import { Compass } from "lucide-react";

const STAGES = [
  "Organizing your information…",
  "Identifying possible research topics…",
  "Structuring your research order…",
  "Preparing plain-language explanations…",
  "Building your roadmap…",
];

/**
 * Deliberately honest, low-drama copy — never claims to be "analyzing
 * your legal claim" or "determining your rights," since the system
 * never does either. A short minimum display time avoids visual
 * flashing without pretending a stage completed before it did.
 */
export function IntakeLoading() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((index) => Math.min(index + 1, STAGES.length - 1));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-card flex w-full max-w-md flex-col items-center gap-4 rounded-3xl p-10 text-center">
      <span className="relative flex size-14 items-center justify-center rounded-full border border-cc-purple/50 bg-gradient-to-br from-cc-purple/25 to-cc-teal/10">
        <Compass
          className="size-6 animate-spin text-cc-purple motion-reduce:animate-none"
          style={{ animationDuration: "2.5s" }}
          aria-hidden="true"
          strokeWidth={1.75}
        />
      </span>
      <p role="status" aria-live="polite" className="text-sm text-cc-muted">
        {STAGES[stageIndex]}
      </p>
    </div>
  );
}
