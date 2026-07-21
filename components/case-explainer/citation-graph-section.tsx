"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RelatedCaseResult } from "@/lib/case-search/types";

type LoadState = "loading" | "ok" | "unavailable";

interface GraphResponse {
  status: "ok" | "unavailable" | "not-configured" | "invalid-request";
  cases?: RelatedCaseResult[];
}

/**
 * Cases citing or cited by this opinion, from CourtListener's citation
 * graph. Every entry's `treatment` is always "cited" (see
 * lib/case-search/types.ts's RelatedCaseResult) — this never claims a
 * later case approved, followed, or overruled the one being read, only
 * that it cites it.
 */
export function CitationGraphSection({ caseId, direction }: { caseId: string; direction: "citing" | "cited" }) {
  const [state, setState] = useState<LoadState>("loading");
  const [cases, setCases] = useState<RelatedCaseResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cases/${caseId}/${direction}`)
      .then((response) => response.json())
      .then((body: GraphResponse) => {
        if (cancelled) return;
        if (body.status === "ok") {
          setCases(body.cases ?? []);
          setState("ok");
        } else {
          setState("unavailable");
        }
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, direction]);

  const title = direction === "citing" ? "Later Cases Citing This Opinion" : "Cases Cited By This Opinion";

  if (state === "loading") {
    return null;
  }

  if (state === "unavailable" || cases.length === 0) {
    return null;
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">{title}</h2>
      <ul className="mt-3 flex flex-col divide-y divide-white/[0.06]">
        {cases.map((related) => (
          <li key={related.case.providerCaseId} className="flex items-center justify-between gap-3 py-3">
            <div>
              <Link
                href={`/dashboard/cases/${related.case.providerCaseId}`}
                className="text-sm font-medium text-cc-text hover:text-cc-purple hover:underline"
              >
                {related.case.caseName}
              </Link>
              <p className="text-xs text-cc-muted">
                {related.case.court}
                {related.case.decisionDate ? ` · ${related.case.decisionDate}` : ""} · cited {related.depth}{" "}
                {related.depth === 1 ? "time" : "times"}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-cc-border px-2 py-0.5 text-[0.65rem] text-cc-muted">
              Cited
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
