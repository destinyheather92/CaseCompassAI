"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CaseResultCard } from "@/components/roadmap/case-result-card";
import { classifyAuthority } from "@/lib/case-search/authority-classifier";
import { CASE_SEARCH_SAFE_ERROR_MESSAGE, NO_CASES_FOUND_MESSAGE } from "@/lib/case-search/case-search-constants";
import type { VerifiedCaseResult, CaseVerificationStatus } from "@/lib/case-search/types";

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

/**
 * Retrieval-only — every case shown here came back from a real
 * provider search (GET /api/roadmaps/[roadmapId]/cases). "Find
 * Additional Cases" narrows with structured filters only, never an
 * open-ended AI chat. See docs/behavior/verified-case-search.md.
 *
 * `jurisdiction` (the roadmap's own, never a user override — see
 * lib/case-search/build-roadmap-case-request.ts) is used only to
 * compute each result's authority badge and to support the authority
 * filter below; it is never sent to the search endpoint as a
 * user-changeable value, since jurisdiction always comes from the
 * roadmap itself (security invariant).
 */
export function CasesToResearch({ roadmapId, jurisdiction }: { roadmapId: string; jurisdiction?: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [cases, setCases] = useState<VerifiedCaseResult[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [courtLevel, setCourtLevel] = useState("");
  const [publishedOnly, setPublishedOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [searching, setSearching] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState<"" | CaseVerificationStatus>("");
  const [authorityFilter, setAuthorityFilter] = useState<"" | "binding" | "persuasive">("");
  const [topicFilter, setTopicFilter] = useState("");

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

  const allTopics = useMemo(() => Array.from(new Set(cases.flatMap((c) => c.matchedTopics))), [cases]);

  const visibleCases = useMemo(() => {
    return cases.filter((caseResult) => {
      if (verificationFilter && caseResult.verificationStatus !== verificationFilter) return false;
      if (authorityFilter) {
        const authority = jurisdiction
          ? classifyAuthority({ roadmapJurisdiction: jurisdiction, caseJurisdiction: caseResult.jurisdiction, caseCourtId: caseResult.courtId })
          : null;
        if (authority !== authorityFilter) return false;
      }
      if (topicFilter && !caseResult.matchedTopics.includes(topicFilter)) return false;
      return true;
    });
  }, [cases, verificationFilter, authorityFilter, topicFilter, jurisdiction]);

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

      {state === "loading" && <p className="mt-4 text-sm text-cc-muted">Loading verified cases…</p>}

      {(state === "unavailable" || state === "error") && (
        <p role={state === "error" ? "alert" : "status"} className="mt-4 text-sm text-cc-muted">
          {message}
        </p>
      )}

      {state === "ready" && (
        <div className="mt-4 flex flex-col gap-4">
          {visibleCases.length === 0 ? (
            <p className="text-sm text-cc-muted">{NO_CASES_FOUND_MESSAGE}</p>
          ) : (
            visibleCases.map((caseResult) => (
              <CaseResultCard
                key={`${caseResult.providerName}-${caseResult.providerCaseId}`}
                caseResult={caseResult}
                roadmapId={roadmapId}
                roadmapJurisdiction={jurisdiction}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
