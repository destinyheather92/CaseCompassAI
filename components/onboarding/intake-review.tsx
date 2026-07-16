"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface AnsweredTurnView {
  questionId: string;
  questionText: string;
  answerText: string;
}

export interface IntakeReviewProps {
  caseType: string;
  jurisdiction: string;
  proceduralStage: string;
  factualSummary: string;
  unresolvedInformation: string[];
  answeredTurns: AnsweredTurnView[];
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  onConfirm: () => void;
  onEditLayer1: () => void;
  submitting: boolean;
}

export function IntakeReview({
  caseType,
  jurisdiction,
  proceduralStage,
  factualSummary,
  unresolvedInformation,
  answeredTurns,
  acknowledged,
  onAcknowledgedChange,
  onConfirm,
  onEditLayer1,
  submitting,
}: IntakeReviewProps) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cc-text">Review What CaseCompass Understood</h2>
        <Button type="button" variant="outline" size="sm" onClick={onEditLayer1}>
          Edit
        </Button>
      </div>

      <dl className="glass-card grid grid-cols-1 gap-4 rounded-2xl p-6 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-cc-muted">Case Category</dt>
          <dd className="mt-1 text-cc-text">{caseType}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-cc-muted">Jurisdiction</dt>
          <dd className="mt-1 text-cc-text">{jurisdiction}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-cc-muted">Procedural Stage</dt>
          <dd className="mt-1 text-cc-text">{proceduralStage}</dd>
        </div>
      </dl>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-semibold text-cc-text">Factual Summary</h3>
        <p className="mt-2 text-sm text-cc-muted">{factualSummary}</p>
      </div>

      {unresolvedInformation.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-cc-text">Unresolved Questions</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-cc-muted">
            {unresolvedInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {answeredTurns.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-cc-text">What You Told Us</h3>
          <dl className="mt-2 flex flex-col gap-3">
            {answeredTurns.map((turn) => (
              <div key={turn.questionId}>
                <dt className="text-sm font-medium text-cc-text">{turn.questionText}</dt>
                <dd className="text-sm text-cc-muted">{turn.answerText}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="flex items-start gap-3">
        <Checkbox
          id="intake-review-acknowledged"
          checked={acknowledged}
          onCheckedChange={(checked) => onAcknowledgedChange(checked === true)}
        />
        <Label htmlFor="intake-review-acknowledged" className="text-sm font-normal leading-snug text-cc-muted">
          I understand that CaseCompass provides general legal education and research guidance and is not providing
          legal advice.
        </Label>
      </div>

      <Button type="button" onClick={onConfirm} disabled={!acknowledged || submitting}>
        {submitting ? "Confirming…" : "Confirm"}
      </Button>
    </div>
  );
}
