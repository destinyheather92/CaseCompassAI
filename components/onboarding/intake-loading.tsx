"use client";

import { useEffect, useState } from "react";

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
    <div className="flex w-full max-w-md flex-col items-center gap-4 py-12 text-center">
      <div
        aria-hidden="true"
        className="size-10 animate-spin rounded-full border-2 border-cc-purple/30 border-t-cc-purple motion-reduce:animate-none"
      />
      <p role="status" aria-live="polite" className="text-sm text-cc-muted">
        {STAGES[stageIndex]}
      </p>
    </div>
  );
}
