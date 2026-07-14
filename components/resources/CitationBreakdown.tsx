"use client";

import { useId, useState } from "react";

export type CitationSegment = {
  text: string;
  label: string;
  definition: string;
};

type CitationBreakdownProps = {
  segments: CitationSegment[];
  fictional?: boolean;
};

export function CitationBreakdown({ segments, fictional = false }: CitationBreakdownProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const panelId = useId();
  const active = activeIndex !== null ? segments[activeIndex] : null;

  return (
    <div className="glass-card rounded-2xl p-6">
      {fictional && (
        <span className="mb-4 inline-flex items-center rounded-full border border-cc-border bg-cc-bg-secondary/60 px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide text-cc-muted uppercase">
          Fictional example
        </span>
      )}
      <p className="flex flex-wrap font-mono text-lg leading-relaxed text-cc-text sm:text-xl">
        {segments.map((segment, i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setActiveIndex(i)}
            onFocus={() => setActiveIndex(i)}
            onClick={() => setActiveIndex(i)}
            aria-describedby={panelId}
            aria-label={`${segment.text.trim()}: ${segment.label}`}
            className={`rounded-md px-0.5 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-cc-purple ${
              activeIndex === i
                ? "bg-cc-purple/25 text-cc-teal"
                : "hover:bg-cc-purple/15 hover:text-cc-teal"
            }`}
          >
            {segment.text}
          </button>
        ))}
      </p>

      <div
        id={panelId}
        aria-live="polite"
        className="mt-5 min-h-20 rounded-xl border border-cc-border bg-cc-bg-secondary/60 p-4"
      >
        {active ? (
          <>
            <p className="text-xs font-bold tracking-widest text-cc-purple uppercase">
              {active.label}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-cc-muted">{active.definition}</p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-cc-muted">
            Hover, focus, or click a highlighted part of the citation above to see what it means.
          </p>
        )}
      </div>
    </div>
  );
}
