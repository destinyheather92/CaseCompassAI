import Link from "next/link";
import type { VerifiedCaseResult } from "@/lib/case-search/types";

export function VerifiedCasesPreview({ roadmapId, cases }: { roadmapId: string; cases: VerifiedCaseResult[] }) {
  if (cases.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Cases to Research</h2>
        <Link href={`/dashboard/roadmaps/${roadmapId}`} className="text-xs font-medium text-cc-purple hover:underline">
          View all
        </Link>
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {cases.map((caseResult) => (
          <li key={`${caseResult.providerName}-${caseResult.providerCaseId}`}>
            <p className="text-sm font-medium text-cc-text">{caseResult.caseName}</p>
            <p className="text-xs text-cc-muted">{caseResult.court}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
