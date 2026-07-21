"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CaseResultCard } from "@/components/roadmap/case-result-card";
import { CASE_SEARCH_SAFE_ERROR_MESSAGE } from "@/lib/case-search/case-search-constants";
import type { CaseVerificationStatus } from "@/lib/case-search/types";
import type { RankedCaseResult, StageAttemptLog } from "@/lib/case-search/pipeline/types";

type LoadState = "loading" | "ready" | "unavailable" | "error";
const COURT_LEVELS = [
  { value: "", label: "Any court level" },
  { value: "trial", label: "Trial" },
  { value: "appellate", label: "Appellate" },
  { value: "supreme", label: "Supreme" },
];

const VERIFICATION_FILTERS: { value: "" | CaseVerificationStatus; label: string }[] = [
  { value: "", label: "Any verification status" },
  { value: "verified", label: "Verified" },
  { value: "possible_match", label: "Possible Match" },
  { value: "not_verified", label: "Not Verified" },
  { value: "source_unavailable", label: "Source Unavailable" },
];

const AUTHORITY_FILTERS = [
  { value: "", label: "Any authority type" },
  { value: "binding", label: "Binding" },
  { value: "persuasive", label: "Persuasive" },
] as const;

function SearchProcessPanel({ attempts }: { attempts: StageAttemptLog[] }) {
  const [open, setOpen] = useState(false);
  if (attempts.length === 0) return null;
  return (
    <div className="mt-4 border-b border-white/[0.06] pb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-cc-muted underline underline-offset-2"
      >
        {open ? "Hide" : "Show"} how we searched
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1 text-xs text-cc-muted">
          {attempts.map((attempt, index) => (
            <li key={`${attempt.stageName}-${index}`}>
              {attempt.label} — {attempt.errored ? "unavailable" : `${attempt.resultCount} result${attempt.resultCount === 1 ? "" : "s"}`}
              {" "}
              ({attempt.elapsedMs}ms){attempt.succeeded ? " ✓" : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExhaustedEmptyState({ suggestedResearchTerms }: { suggestedResearchTerms: string[] }) {
  return (
    <div className="text-sm text-cc-muted">
      <p>
        We couldn&apos;t locate cases directly matching these facts, even after broadening the search across related legal issues,
        federal courts, and other jurisdictions.
      </p>
      {suggestedResearchTerms.length > 0 && (
        <>
          <p className="mt-2 font-medium text-cc-text">Try researching these related terms directly:</p>
          <ul className="mt-1 list-disc pl-5">
            {suggestedResearchTerms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-2">
        Your roadmap and educational resources remain available in the meantime, and new opinions are added to the source
        database regularly.
      </p>
    </div>
  );
}

/**
 * Retrieval-only — every case shown here came back from a real
 * provider search, run through the progressive multi-stage pipeline
 * (lib/case-search/pipeline/) that broadens the query and jurisdiction
 * until it finds something rather than stopping at the first empty
 * result. "Find Additional Cases" narrows with structured filters only,
 * never an open-ended AI chat. See docs/behavior/verified-case-search.md.
 *
 * `jurisdiction` (the roadmap's own, never a user override) is used only
 * for the authority filter's label; the pipeline itself already
 * determines binding vs. persuasive per case via `isPersuasiveAuthority`.
 */
export function CasesToResearch({ roadmapId }: { roadmapId: string; jurisdiction?: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [cases, setCases] = useState<RankedCaseResult[]>([]);
  const [attempts, setAttempts] = useState<StageAttemptLog[]>([]);
  const [isExhaustedFallback, setIsExhaustedFallback] = useState(false);
  const [suggestedResearchTerms, setSuggestedResearchTerms] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [courtLevel, setCourtLevel] = useState("");
  const [publishedOnly, setPublishedOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [searching, setSearching] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState<"" | CaseVerificationStatus>("");
  const [authorityFilter, setAuthorityFilter] = useState<"" | "binding" | "persuasive">("");
  const [topicFilter, setTopicFilter] = useState("");

  function applyResult(body: {
    status: string;
    cases?: RankedCaseResult[];
    attempts?: StageAttemptLog[];
    isExhaustedFallback?: boolean;
    suggestedResearchTerms?: string[];
    message?: string;
  }) {
    if (body.status === "ok") {
      setCases(body.cases ?? []);
      setAttempts(body.attempts ?? []);
      setIsExhaustedFallback(body.isExhaustedFallback ?? false);
      setSuggestedResearchTerms(body.suggestedResearchTerms ?? []);
      setState("ready");
      setMessage(null);
    } else if (body.status === "unavailable") {
      setMessage(body.message ?? CASE_SEARCH_SAFE_ERROR_MESSAGE);
      setState("unavailable");
    } else {
      setMessage(body.message ?? CASE_SEARCH_SAFE_ERROR_MESSAGE);
      setState("error");
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/roadmaps/${roadmapId}/cases`)
      .then((response) => response.json())
      .then((body) => {
        if (cancelled) return;
        applyResult(body);
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
      applyResult(body);
    } catch {
      setMessage(CASE_SEARCH_SAFE_ERROR_MESSAGE);
      setState("error");
    } finally {
      setSearching(false);
    }
  }

  const allTopics = useMemo(() => Array.from(new Set(cases.flatMap((c) => c.case.matchedTopics))), [cases]);

  const visibleCases = useMemo(() => {
    return cases.filter((ranked) => {
      if (verificationFilter && ranked.case.verificationStatus !== verificationFilter) return false;
      if (authorityFilter) {
        const authority = ranked.isPersuasiveAuthority ? "persuasive" : "binding";
        if (authority !== authorityFilter) return false;
      }
      if (topicFilter && !ranked.case.matchedTopics.includes(topicFilter)) return false;
      return true;
    });
  }, [cases, verificationFilter, authorityFilter, topicFilter]);

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

      {state === "ready" && cases.length > 0 && (
        <div className="mt-4 flex flex-wrap items-end gap-4 border-b border-white/[0.06] pb-4">
          <div>
            <Label htmlFor="case-verification-filter" className="text-xs text-cc-muted">
              Verification status
            </Label>
            <select
              id="case-verification-filter"
              value={verificationFilter}
              onChange={(event) => setVerificationFilter(event.target.value as typeof verificationFilter)}
              className="mt-1 block rounded-lg border border-cc-border bg-transparent px-2.5 py-1.5 text-sm text-cc-text"
            >
              {VERIFICATION_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="case-authority-filter" className="text-xs text-cc-muted">
              Authority type
            </Label>
            <select
              id="case-authority-filter"
              value={authorityFilter}
              onChange={(event) => setAuthorityFilter(event.target.value as typeof authorityFilter)}
              className="mt-1 block rounded-lg border border-cc-border bg-transparent px-2.5 py-1.5 text-sm text-cc-text"
            >
              {AUTHORITY_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          {allTopics.length > 0 && (
            <div>
              <Label htmlFor="case-topic-filter" className="text-xs text-cc-muted">
                Roadmap topic
              </Label>
              <select
                id="case-topic-filter"
                value={topicFilter}
                onChange={(event) => setTopicFilter(event.target.value)}
                className="mt-1 block rounded-lg border border-cc-border bg-transparent px-2.5 py-1.5 text-sm text-cc-text"
              >
                <option value="">Any topic</option>
                {allTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {state === "loading" && <p className="mt-4 text-sm text-cc-muted">Searching across your jurisdiction and related sources…</p>}

      {(state === "unavailable" || state === "error") && (
        <p role={state === "error" ? "alert" : "status"} className="mt-4 text-sm text-cc-muted">
          {message}
        </p>
      )}

      {state === "ready" && <SearchProcessPanel attempts={attempts} />}

      {state === "ready" && (
        <div className="mt-4 flex flex-col gap-4">
          {visibleCases.length === 0 ? (
            isExhaustedFallback ? (
              <ExhaustedEmptyState suggestedResearchTerms={suggestedResearchTerms} />
            ) : (
              <p className="text-sm text-cc-muted">No cases match the selected filters. Try broadening them.</p>
            )
          ) : (
            visibleCases.map((ranked) => (
              <CaseResultCard
                key={`${ranked.case.providerName}-${ranked.case.providerCaseId}`}
                caseResult={ranked.case}
                roadmapId={roadmapId}
                confidence={ranked.confidence}
                isPersuasiveAuthority={ranked.isPersuasiveAuthority}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
