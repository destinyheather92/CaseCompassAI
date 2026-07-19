"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CaseResultCard } from "@/components/roadmap/case-result-card";
import { CASE_SEARCH_SAFE_ERROR_MESSAGE } from "@/lib/case-search/case-search-constants";
import type { VerifiedCaseResult } from "@/lib/case-search/types";

type LoadState = "loading" | "ready" | "unavailable" | "error";
const COURT_LEVELS = [
  { value: "", label: "Any court level" },
  { value: "trial", label: "Trial" },
  { value: "appellate", label: "Appellate" },
  { value: "supreme", label: "Supreme" },
];

/**
 * Retrieval-only — every case shown here came back from a real
 * provider search (GET /api/roadmaps/[roadmapId]/cases). "Find
 * Additional Cases" narrows with structured filters only, never an
 * open-ended AI chat. See docs/behavior/verified-case-search.md.
 */
export function CasesToResearch({ roadmapId }: { roadmapId: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [cases, setCases] = useState<VerifiedCaseResult[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [courtLevel, setCourtLevel] = useState("");
  const [publishedOnly, setPublishedOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/roadmaps/${roadmapId}/cases`)
      .then((response) => response.json())
      .then((body) => {
        if (cancelled) return;
        if (body.status === "ok") {
          setCases(body.page.cases);
          setState("ready");
        } else if (body.status === "unavailable") {
          setMessage(body.message);
          setState("unavailable");
        } else {
          setMessage(body.message ?? CASE_SEARCH_SAFE_ERROR_MESSAGE);
          setState("error");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessage(CASE_SEARCH_SAFE_ERROR_MESSAGE);
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [roadmapId]);

  async function handleFindMore() {
    setSearching(true);
    try {
      const response = await fetch(`/api/roadmaps/${roadmapId}/cases/search`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          courtLevel: courtLevel || undefined,
          publishedOnly: publishedOnly || undefined,
          dateRange: dateFrom ? { from: dateFrom } : undefined,
        }),
      });
      const body = await response.json();
      if (body.status === "ok") {
        setCases(body.page.cases);
        setState("ready");
        setMessage(null);
      } else {
        setMessage(body.message ?? CASE_SEARCH_SAFE_ERROR_MESSAGE);
        setState(body.status === "unavailable" ? "unavailable" : "error");
      }
    } catch {
      setMessage(CASE_SEARCH_SAFE_ERROR_MESSAGE);
      setState("error");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Cases to Research</h2>
        {state !== "unavailable" && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)}>
            Find Additional Cases
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="mt-4 flex flex-wrap items-end gap-4 border-b border-white/[0.06] pb-4">
          <div>
            <Label htmlFor="case-court-level" className="text-xs text-cc-muted">
              Court level
            </Label>
            <select
              id="case-court-level"
              value={courtLevel}
              onChange={(event) => setCourtLevel(event.target.value)}
              className="mt-1 block rounded-lg border border-cc-border bg-transparent px-2.5 py-1.5 text-sm text-cc-text"
            >
              {COURT_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="case-date-from" className="text-xs text-cc-muted">
              Decided after
            </Label>
            <input
              id="case-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-1 block rounded-lg border border-cc-border bg-transparent px-2.5 py-1.5 text-sm text-cc-text"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="case-published-only"
              checked={publishedOnly}
              onCheckedChange={(checked) => setPublishedOnly(checked === true)}
            />
            <Label htmlFor="case-published-only" className="text-xs text-cc-muted">
              Published only
            </Label>
          </div>
          <Button type="button" size="sm" onClick={handleFindMore} disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
      )}

      {state === "loading" && <p className="mt-4 text-sm text-cc-muted">Loading verified cases…</p>}

      {(state === "unavailable" || state === "error") && (
        <p role={state === "error" ? "alert" : "status"} className="mt-4 text-sm text-cc-muted">
          {message}
        </p>
      )}

      {state === "ready" && (
        <div className="mt-4 flex flex-col gap-4">
          {cases.length === 0 ? (
            <p className="text-sm text-cc-muted">No verified cases found for these filters yet.</p>
          ) : (
            cases.map((caseResult) => (
              <CaseResultCard key={`${caseResult.providerName}-${caseResult.providerCaseId}`} caseResult={caseResult} roadmapId={roadmapId} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
