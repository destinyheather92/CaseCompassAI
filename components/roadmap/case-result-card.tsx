"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { LATER_HISTORY_NOT_CHECKED_NOTICE } from "@/lib/case-search/case-search-constants";
import { classifyAuthority } from "@/lib/case-search/authority-classifier";
import type { VerifiedCaseResult } from "@/lib/case-search/types";

type SaveState = "idle" | "saving" | "saved" | "already-saved" | "error";

const VERIFICATION_BADGE_LABELS: Record<VerifiedCaseResult["verificationStatus"], string> = {
  verified: "Verified",
  possible_match: "Possible Match",
  not_verified: "Not Verified",
  source_unavailable: "Source Unavailable",
};

const VERIFICATION_BADGE_VARIANTS: Record<VerifiedCaseResult["verificationStatus"], "default" | "secondary" | "outline"> = {
  verified: "default",
  possible_match: "secondary",
  not_verified: "outline",
  source_unavailable: "outline",
};

const AUTHORITY_LABELS = { binding: "Binding", persuasive: "Persuasive" } as const;

/**
 * Every field rendered here comes directly from a verified provider
 * record (VerifiedCaseResult) — nothing on this card is AI-generated.
 * relevanceSummary is deliberately cautious language, never a claim
 * that this case proves or guarantees anything about the user's
 * situation. See docs/behavior/verified-case-search.md.
 *
 * `roadmapJurisdiction` is optional — when provided, an authority badge
 * (Binding/Persuasive) is shown, computed only from reliable
 * jurisdiction metadata (see lib/case-search/authority-classifier.ts).
 * No badge is shown at all when the relationship can't be determined,
 * rather than guessing.
 */
export function CaseResultCard({
  caseResult,
  roadmapId,
  roadmapJurisdiction,
}: {
  caseResult: VerifiedCaseResult;
  roadmapId?: string;
  roadmapJurisdiction?: string;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const authority = roadmapJurisdiction
    ? classifyAuthority({
        roadmapJurisdiction,
        caseJurisdiction: caseResult.jurisdiction,
        caseCourtId: caseResult.courtId,
      })
    : null;

  async function handleSave() {
    setSaveState("saving");
    try {
      const response = await fetch("/api/saved-cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roadmapId,
          providerName: caseResult.providerName,
          providerCaseId: caseResult.providerCaseId,
          caseName: caseResult.caseName,
          citation: caseResult.citation ?? undefined,
          court: caseResult.court,
          jurisdiction: caseResult.jurisdiction,
          decisionDate: caseResult.decisionDate ?? undefined,
          docketNumber: caseResult.docketNumber ?? undefined,
          sourceUrl: caseResult.sourceUrl,
          sourceName: caseResult.sourceName,
          matchedTopic: caseResult.matchedTopics[0],
        }),
      });
      const body = await response.json();
      if (body.status === "saved" || body.status === "already-saved") {
        setSaveState(body.status);
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
  }

  const saved = saveState === "saved" || saveState === "already-saved";

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-cc-text">{caseResult.caseName}</h3>
          <p className="text-xs text-cc-muted">
            {caseResult.court}
            {caseResult.citation ? ` · ${caseResult.citation}` : ""}
            {caseResult.decisionDate ? ` · ${caseResult.decisionDate}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Badge variant={VERIFICATION_BADGE_VARIANTS[caseResult.verificationStatus]}>
            {VERIFICATION_BADGE_LABELS[caseResult.verificationStatus]}
          </Badge>
          {authority && <Badge variant="outline">{AUTHORITY_LABELS[authority]}</Badge>}
          <Badge variant={caseResult.publicationStatus === "published" ? "default" : "outline"}>
            {caseResult.publicationStatus}
          </Badge>
        </div>
      </div>

      <p className="mt-3 text-xs text-cc-teal">{caseResult.relevanceSummary}</p>

      {caseResult.matchedTopics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {caseResult.matchedTopics.map((topic) => (
            <span key={topic} className="rounded-full border border-cc-purple/40 px-2 py-0.5 text-[0.65rem] text-cc-purple">
              {topic}
            </span>
          ))}
        </div>
      )}

      {caseResult.laterHistoryStatus === "not-checked" && (
        <p className="mt-2 text-[0.7rem] text-cc-muted">{LATER_HISTORY_NOT_CHECKED_NOTICE}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link
          href={`/dashboard/cases/${caseResult.providerCaseId}`}
          className={buttonVariants({ size: "sm" })}
        >
          View Case
        </Link>
        <a
          href={caseResult.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "sm", variant: "outline" })}
        >
          View Source
        </a>
        <Button type="button" size="sm" variant="outline" onClick={handleSave} disabled={saveState === "saving" || saved}>
          {saved ? "Saved" : saveState === "saving" ? "Saving…" : "Save Case"}
        </Button>
      </div>
      {saveState === "error" && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          Could not save this case right now.
        </p>
      )}

      <p className="mt-3 text-[0.65rem] text-cc-muted">{caseResult.disclaimer}</p>
    </div>
  );
}
