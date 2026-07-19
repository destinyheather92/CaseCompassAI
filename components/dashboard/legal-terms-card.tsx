import Link from "next/link";
import type { DashboardLegalTerm } from "@/lib/dashboard/legal-terms-for-intake";

export function LegalTermsCard({ legalTerms }: { legalTerms: DashboardLegalTerm[] }) {
  if (legalTerms.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Legal Terms For You</h2>
      <dl className="mt-4 flex flex-col gap-3">
        {legalTerms.map((term) => (
          <div key={term.term}>
            <dt>
              <Link href={term.href} className="text-sm font-semibold text-cc-text hover:text-cc-purple">
                {term.term}
              </Link>
            </dt>
            <dd className="text-xs text-cc-muted">{term.plainLanguageDefinition}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
