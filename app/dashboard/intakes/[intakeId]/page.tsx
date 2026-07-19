import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { requireDashboardAccess } from "@/lib/auth/dashboard-authorization";
import { getIntakeDetail } from "@/lib/dashboard/get-intake-detail";
import { caseTypeLabel, proceduralStageLabel } from "@/lib/intake-options-data";
import { JURISDICTION_OPTIONS } from "@/lib/jurisdictions-data";
import { IntakeTimeline } from "@/components/dashboard/intake-timeline";
import { UnresolvedQuestionsCard } from "@/components/dashboard/unresolved-questions-card";
import { GenerateRoadmapButton } from "@/components/dashboard/generate-roadmap-button";
import type { CaseType, ProceduralStage } from "@/types/intake";

export const metadata: Metadata = {
  title: "Intake Details | CaseCompass AI",
};

export default async function IntakeDetailPage({ params }: { params: Promise<{ intakeId: string }> }) {
  const authResult = await requireDashboardAccess();
  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  const { intakeId } = await params;
  const result = await getIntakeDetail(intakeId, authResult.user);
  if (result.status === "not-found") {
    notFound();
  }

  const { intake } = result;
  const jurisdictionLabel = JURISDICTION_OPTIONS.find((option) => option.value === intake.jurisdiction)?.label ?? intake.jurisdiction;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-cc-text">Intake Details</h1>
        <p className="mt-1 text-sm text-cc-muted">Everything CaseCompass has recorded from your intake, in your own words.</p>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        {intake.factualSummary && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="text-xs text-cc-muted">Summary</p>
            <p className="mt-1 text-sm text-cc-text">{intake.factualSummary}</p>
          </div>
        )}
      </div>

      {intake.status === "completed" && !intake.hasRoadmap && (
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm text-cc-text">Your intake is confirmed. Ready to build your research roadmap?</p>
          <div className="mt-3">
            <GenerateRoadmapButton intakeId={intake.id} />
          </div>
        </div>
      )}

      {(intake.status === "interviewing" || intake.status === "needs-clarification" || intake.status === "ready-for-review") && (
        <div className="glass-card rounded-2xl p-6">
          <p className="text-sm text-cc-text">This intake isn&apos;t finished yet.</p>
          <p className="mt-1 text-xs text-cc-muted">
            Pick up right where you left off — your answers so far are saved.
          </p>
          <Link href={`/get-started?sessionId=${intake.id}`} className={buttonVariants({ variant: "default", className: "mt-3" })}>
            Continue Intake
          </Link>
        </div>
      )}

      <UnresolvedQuestionsCard unresolvedInformation={intake.unresolvedInformation} />
      <IntakeTimeline timeline={intake.timeline} />

      {intake.answers.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Your Answers</h2>
          <dl className="mt-4 flex flex-col gap-4">
            {intake.answers.map((answer) => (
              <div key={answer.questionId}>
                <dt className="text-sm font-medium text-cc-text">{answer.questionText}</dt>
                <dd className="mt-0.5 text-sm text-cc-muted">{answer.answerText}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
