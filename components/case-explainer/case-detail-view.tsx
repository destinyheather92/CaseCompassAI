"use client";

import { useEffect, useState } from "react";
import {
  Gavel,
  Scale,
  FileText,
  Quote,
  Sparkles,
  HelpCircle,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AI_EXPLANATION_LABEL, AI_EXPLANATION_DISCLAIMER } from "@/lib/case-search/case-search-constants";
import { highlightOpinionText } from "@/lib/case-explainer/highlight-opinion-text";
import { SourceAttributionPanel } from "@/components/case-explainer/source-attribution-panel";
import { CitationGraphSection } from "@/components/case-explainer/citation-graph-section";
import type { VerifiedCaseResult } from "@/lib/case-search/types";
import type { VerifiedCaseExplanation } from "@/lib/case-explainer/case-explanation-schema";

type LoadState = "loading" | "not-found" | "ok" | "explanation-unavailable";
type ViewMode = "plain-english" | "original";
type SaveState = "idle" | "saving" | "saved" | "already-saved" | "error";

interface ExplainResponse {
  status: LoadState;
  caseResult?: VerifiedCaseResult;
  explanation?: VerifiedCaseExplanation;
  opinionText?: string | null;
  message?: string;
}

export function CaseDetailView({ caseId }: { caseId: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [caseResult, setCaseResult] = useState<VerifiedCaseResult | null>(null);
  const [explanation, setExplanation] = useState<VerifiedCaseExplanation | null>(null);
  const [opinionText, setOpinionText] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("plain-english");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cases/${caseId}/explain`)
      .then((response) => response.json())
      .then((body: ExplainResponse) => {
        if (cancelled) return;
        if (body.status === "ok" && body.caseResult && body.explanation) {
          setCaseResult(body.caseResult);
          setExplanation(body.explanation);
          setOpinionText(body.opinionText ?? null);
          setState("ok");
        } else if (body.status === "explanation-unavailable" && body.caseResult) {
          setCaseResult(body.caseResult);
          setOpinionText(body.opinionText ?? null);
          setMessage(body.message ?? null);
          setMode("original");
          setState("explanation-unavailable");
        } else {
          setState("not-found");
        }
      })
      .catch(() => setState("not-found"));
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  async function handleSave() {
    if (!caseResult) return;
    setSaveState("saving");
    try {
      const response = await fetch("/api/saved-cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      const body = await response.json();
      setSaveState(body.status === "saved" || body.status === "already-saved" ? body.status : "error");
    } catch {
      setSaveState("error");
    }
  }

  if (state === "loading") {
    return (
      <div className="glass-card flex flex-col items-center gap-3 rounded-3xl p-12 text-center">
        <Compass className="size-6 animate-spin text-cc-purple motion-reduce:animate-none" aria-hidden="true" />
        <p role="status" aria-live="polite" className="text-sm text-cc-muted">
          Loading this case…
        </p>
      </div>
    );
  }

  if (state === "not-found" || !caseResult) {
    return (
      <div role="alert" className="glass-card rounded-3xl p-12 text-center">
        <p className="text-sm text-cc-text">This case couldn&apos;t be found or isn&apos;t available right now.</p>
      </div>
    );
  }

  const saved = saveState === "saved" || saveState === "already-saved";

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card rounded-3xl p-6 sm:p-8">
        <h1 className="text-xl font-bold text-cc-text sm:text-2xl">{caseResult.caseName}</h1>

        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="mb-3 text-xs font-semibold tracking-wide text-cc-muted uppercase">Source Attribution</p>
          <SourceAttributionPanel caseResult={caseResult} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
          <Button type="button" size="sm" variant="outline" onClick={handleSave} disabled={saveState === "saving" || saved}>
            {saved ? "Saved" : saveState === "saving" ? "Saving…" : "Save Case"}
          </Button>
          {saveState === "error" && (
            <p role="alert" className="text-xs text-destructive">
              Could not save this case right now.
            </p>
          )}
        </div>
      </div>

      {state === "explanation-unavailable" && message && (
        <p role="status" className="glass-card rounded-2xl p-4 text-sm text-cc-muted">
          {message}
        </p>
      )}

      <div className="flex w-fit gap-1 rounded-full border border-cc-border bg-white/[0.03] p-1">
        <button
          type="button"
          onClick={() => setMode("plain-english")}
          disabled={!explanation}
          aria-pressed={mode === "plain-english"}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            mode === "plain-english" ? "bg-cc-purple text-white" : "text-cc-muted hover:text-cc-text"
          }`}
        >
          Plain-Language Guide
        </button>
        <button
          type="button"
          onClick={() => setMode("original")}
          aria-pressed={mode === "original"}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            mode === "original" ? "bg-cc-purple text-white" : "text-cc-muted hover:text-cc-text"
          }`}
        >
          Original Opinion
        </button>
      </div>

      {mode === "plain-english" && explanation && <PlainEnglishView explanation={explanation} />}

      {mode === "original" && (
        <OriginalOpinionView
          opinionText={opinionText}
          quotes={explanation?.importantQuotes ?? []}
          sourceUrl={caseResult.sourceUrl}
          sourceName={caseResult.sourceName}
        />
      )}

      <CitationGraphSection caseId={caseResult.providerCaseId} direction="citing" />
      <CitationGraphSection caseId={caseResult.providerCaseId} direction="cited" />
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Scale; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-cc-muted uppercase">
        <Icon className="size-4 text-cc-purple" aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-3 text-sm text-cc-text">{children}</div>
    </div>
  );
}

function PlainEnglishView({ explanation }: { explanation: VerifiedCaseExplanation }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-cc-purple/30 bg-cc-purple/10 p-4">
        <p className="text-xs font-semibold text-cc-purple">{AI_EXPLANATION_LABEL}</p>
        <p className="mt-1 text-xs text-cc-muted">{AI_EXPLANATION_DISCLAIMER}</p>
      </div>

      {!explanation.basedOnFullOpinionText && (
        <p role="status" className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-200">
          The full opinion text wasn&apos;t available from our verified source for this case, so this summary is
          based on limited case information only.
        </p>
      )}

      <Section icon={Sparkles} title="Case Summary">
        <p>{explanation.caseSummary}</p>
      </Section>

      {explanation.keyFacts.length > 0 && (
        <Section icon={FileText} title="Facts">
          <ul className="flex flex-col gap-2">
            {explanation.keyFacts.map((fact, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-cc-muted">•</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section icon={HelpCircle} title="Legal Issue(s)">
        <ul className="flex flex-col gap-2">
          {explanation.legalIssues.map((issue, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-cc-muted">•</span>
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={Gavel} title="Holding">
        <p>{explanation.holding}</p>
      </Section>

      <Section icon={Scale} title="Court's Reasoning">
        <p>{explanation.courtsReasoning}</p>
      </Section>

      <Section icon={FileText} title="Rule of Law">
        <p>{explanation.ruleOfLaw}</p>
      </Section>

      <Section icon={Sparkles} title="Why This Case Matters">
        <p>{explanation.whyThisCaseMatters}</p>
      </Section>

      <Section icon={Compass} title="How It Could Relate to My Situation">
        <p>{explanation.howItMightRelate}</p>
      </Section>

      {explanation.importantQuotes.length > 0 && (
        <Section icon={Quote} title="Important Quotes">
          <div className="flex flex-col gap-4">
            {explanation.importantQuotes.map((q, i) => (
              <blockquote key={i} className="border-l-2 border-cc-purple/50 pl-4">
                <p className="text-xs font-semibold tracking-wide text-cc-muted uppercase">Quotation from the opinion</p>
                <p className="mt-1 italic text-cc-text">&ldquo;{q.quote}&rdquo;</p>
                <p className="mt-1 text-xs text-cc-muted">{q.whyItMatters}</p>
                <p className="mt-1 text-[0.65rem] text-cc-muted">Paragraph {q.location.paragraphNumber} of the original opinion</p>
              </blockquote>
            ))}
          </div>
        </Section>
      )}

      {explanation.keyTerms.length > 0 && (
        <Section icon={HelpCircle} title="Key Legal Terms">
          <dl className="flex flex-col gap-3">
            {explanation.keyTerms.map((term) => (
              <div key={term.term}>
                <dt className="text-sm font-semibold text-cc-text">{term.term}</dt>
                <dd className="text-xs text-cc-muted">{term.definition}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
    </div>
  );
}

function OriginalOpinionView({
  opinionText,
  quotes,
  sourceUrl,
  sourceName,
}: {
  opinionText: string | null;
  quotes: VerifiedCaseExplanation["importantQuotes"];
  sourceUrl: string;
  sourceName: string;
}) {
  if (!opinionText) {
    return (
      <div className="glass-card rounded-2xl p-6 text-sm text-cc-muted">
        <p>
          Full opinion text isn&apos;t available from our verified source for this case. You can still read the
          original opinion at{" "}
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-cc-purple hover:underline">
            {sourceName}
          </a>
          .
        </p>
      </div>
    );
  }

  const segments = highlightOpinionText(
    opinionText,
    quotes.map((q) => q.quote),
  );

  return (
    <div className="glass-card rounded-2xl p-6 sm:p-8">
      <p className="mb-1 text-xs font-semibold tracking-wide text-cc-muted uppercase">Original Legal Source</p>
      <p className="mb-4 text-xs text-cc-muted">
        Reproduced from{" "}
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-cc-purple hover:underline">
          {sourceName}
        </a>
        , unaltered. Highlighted passages are quoted in the Plain-Language Guide.
      </p>
      <div className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap font-serif text-sm leading-relaxed text-cc-text">
        {segments.map((segment, i) =>
          segment.highlighted ? (
            <mark key={i} className="rounded bg-cc-purple/25 px-0.5 text-cc-text">
              {segment.text}
            </mark>
          ) : (
            <span key={i}>{segment.text}</span>
          ),
        )}
      </div>
    </div>
  );
}
