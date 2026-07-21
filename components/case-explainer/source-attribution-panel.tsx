import { CASELAW_ACCESS_PROJECT_NOTICE } from "@/lib/case-search/case-search-constants";
import type { VerifiedCaseResult } from "@/lib/case-search/types";

const VERIFICATION_LABELS: Record<VerifiedCaseResult["verificationStatus"], string> = {
  verified: "Verified",
  possible_match: "Possible Match",
  not_verified: "Not Verified",
  source_unavailable: "Source Unavailable",
};

const VERIFICATION_METHOD_LABELS: Record<VerifiedCaseResult["verificationMethod"], string> = {
  "citation-lookup": "citation lookup",
  "id-lookup": "case identifier lookup",
  "search-match": "search match",
  none: "not verified",
};

const SOURCE_OPERATOR_LABELS: Record<string, string> = {
  courtlistener: "CourtListener, operated by Free Law Project",
};

/**
 * The required source panel every case card and case detail page must
 * show — see docs/behavior/verified-case-search.md. Never labels the
 * data provider as the court itself: the provider line always names the
 * operating organization, and the court is shown as a clearly separate field.
 */
export function SourceAttributionPanel({ caseResult }: { caseResult: VerifiedCaseResult }) {
  const sourceLabel = SOURCE_OPERATOR_LABELS[caseResult.providerName] ?? caseResult.sourceName;

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
      <div>
        <dt className="text-cc-muted">Source</dt>
        <dd className="font-medium text-cc-text">{sourceLabel}</dd>
      </div>
      <div>
        <dt className="text-cc-muted">Case</dt>
        <dd className="font-medium text-cc-text">{caseResult.caseName}</dd>
      </div>
      {caseResult.citation && (
        <div>
          <dt className="text-cc-muted">Citation</dt>
          <dd className="font-medium text-cc-text">{caseResult.citation}</dd>
        </div>
      )}
      <div>
        <dt className="text-cc-muted">Court</dt>
        <dd className="font-medium text-cc-text">{caseResult.court}</dd>
      </div>
      {caseResult.decisionDate && (
        <div>
          <dt className="text-cc-muted">Decision date</dt>
          <dd className="font-medium text-cc-text">{caseResult.decisionDate}</dd>
        </div>
      )}
      {caseResult.docketNumber && (
        <div>
          <dt className="text-cc-muted">Docket number</dt>
          <dd className="font-medium text-cc-text">{caseResult.docketNumber}</dd>
        </div>
      )}
      <div>
        <dt className="text-cc-muted">CourtListener case ID</dt>
        <dd className="font-mono text-cc-text">{caseResult.providerCaseId}</dd>
      </div>
      <div>
        <dt className="text-cc-muted">Verification</dt>
        <dd className="font-medium text-cc-text">
          {VERIFICATION_LABELS[caseResult.verificationStatus]}
          {caseResult.verificationMethod !== "none" && ` (${VERIFICATION_METHOD_LABELS[caseResult.verificationMethod]})`}
        </dd>
      </div>
      <div>
        <dt className="text-cc-muted">Retrieved</dt>
        <dd className="font-medium text-cc-text">{new Date(caseResult.dateVerified).toLocaleString()}</dd>
      </div>
      {caseResult.originalCollection === "caselaw-access-project" && (
        <div className="sm:col-span-2">
          <dd className="text-cc-muted">{CASELAW_ACCESS_PROJECT_NOTICE}</dd>
        </div>
      )}
      <div className="sm:col-span-2">
        <a
          href={caseResult.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-cc-purple hover:underline"
        >
          View source opinion
        </a>
      </div>
    </dl>
  );
}
