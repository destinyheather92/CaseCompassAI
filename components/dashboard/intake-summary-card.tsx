import Link from "next/link";
import { caseTypeLabel, proceduralStageLabel } from "@/lib/intake-options-data";
import { JURISDICTION_OPTIONS } from "@/lib/jurisdictions-data";
import type { DashboardActiveIntake } from "@/lib/dashboard/get-dashboard-overview";
import type { CaseType, ProceduralStage } from "@/types/intake";

export function IntakeSummaryCard({ intake }: { intake: DashboardActiveIntake }) {
  const jurisdictionLabel = JURISDICTION_OPTIONS.find((option) => option.value === intake.jurisdiction)?.label ?? intake.jurisdiction;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Intake Summary</h2>
        <Link href={`/dashboard/intakes/${intake.id}`} className="text-xs font-medium text-cc-purple hover:underline">
          View details
        </Link>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-cc-muted">Case Type</dt>
          <dd className="mt-1 text-sm font-medium text-cc-text">{caseTypeLabel(intake.caseType as CaseType)}</dd>
        </div>
        <div>
          <dt className="text-xs text-cc-muted">Jurisdiction</dt>
          <dd className="mt-1 text-sm font-medium text-cc-text">{jurisdictionLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-cc-muted">Procedural Stage</dt>
          <dd className="mt-1 text-sm font-medium text-cc-text">{proceduralStageLabel(intake.proceduralStage as ProceduralStage)}</dd>
        </div>
      </dl>
    </div>
  );
}
