"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CuratedGlossaryEntry } from "@/lib/legal-sources/curated-glossary-provider";

type GlossaryIntroGridProps = {
  terms: CuratedGlossaryEntry[];
};

export function GlossaryIntroGrid({ terms }: GlossaryIntroGridProps) {
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(terms.map((t) => t.category)))],
    [terms],
  );
  const [activeCategory, setActiveCategory] = useState("All");

  const visibleTerms =
    activeCategory === "All" ? terms : terms.filter((t) => t.category === activeCategory);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter terms by category">
        {categories.map((category) => {
          const isActive = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-cc-purple ${
                isActive
                  ? "border-cc-purple/60 bg-cc-purple/15 text-cc-text"
                  : "border-cc-border bg-cc-card text-cc-muted hover:text-cc-text"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTerms.map((entry) => (
          <li
            key={entry.slug}
            className="glass-card flex flex-col items-start rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cc-purple/60 hover:shadow-[0_12px_40px_rgba(139,92,246,0.2)]"
          >
            <span className="text-xs font-bold tracking-widest text-cc-purple/80 uppercase">
              {entry.category}
            </span>
            <h3 className="mt-2 text-base font-bold leading-snug text-cc-text">{entry.term}</h3>
            <p className="mt-2 text-sm leading-relaxed text-cc-muted">
              {entry.plainLanguageDefinition}
            </p>
            <Link
              href={`?term=${entry.slug}#term-search`}
              scroll={false}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-cc-purple transition-colors hover:text-cc-teal outline-none focus-visible:ring-2 focus-visible:ring-cc-purple rounded-sm"
            >
              Learn More
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
