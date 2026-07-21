"use client";

import { ClipboardList, FileText, HelpCircle, MessagesSquare } from "lucide-react";
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
    <div className="flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-cc-text sm:text-3xl">Review What CaseCompass Understood</h2>
        <Button type="button" variant="outline" size="sm" onClick={onEditLayer1}>
          Edit
        </Button>
      </div>

      <dl className="glass-card grid grid-cols-1 gap-4 rounded-2xl p-6 sm:grid-cols-3">
        <div>
          <dt className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-cc-muted uppercase">
            <ClipboardList className="size-3.5 text-cc-purple" aria-hidden="true" />
            Case Category
          </dt>
          <dd className="mt-1.5 font-medium text-cc-text">{caseType}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-wide text-cc-muted uppercase">Jurisdiction</dt>
          <dd className="mt-1.5 font-medium text-cc-text">{jurisdiction}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold tracking-wide text-cc-muted uppercase">Procedural Stage</dt>
          <dd className="mt-1.5 font-medium text-cc-text">{proceduralStage}</dd>
        </div>
      </dl>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="flex items-center gap-2 font-semibold text-cc-text">
          <FileText className="size-4 text-cc-teal" aria-hidden="true" />
          Factual Summary
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-cc-muted">{factualSummary}</p>
      </div>

      {unresolvedInformation.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="flex items-center gap-2 font-semibold text-cc-text">
            <HelpCircle className="size-4 text-cc-teal" aria-hidden="true" />
            Unresolved Questions
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-cc-muted">
            {unresolvedInformation.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-cc-purple" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {answeredTurns.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="flex items-center gap-2 font-semibold text-cc-text">
            <MessagesSquare className="size-4 text-cc-teal" aria-hidden="true" />
            What You Told Us
          </h3>
          <dl className="mt-3 flex flex-col gap-3 divide-y divide-white/[0.06]">
            {answeredTurns.map((turn) => (
              <div key={turn.questionId} className="pt-3 first:pt-0">
                <dt className="text-sm font-medium text-cc-text">{turn.questionText}</dt>
                <dd className="mt-0.5 text-sm text-cc-muted">{turn.answerText}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="glass-card flex flex-col gap-4 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Checkbox
            id="intake-review-acknowledged"
            checked={acknowledged}
            onCheckedChange={(checked) => onAcknowledgedChange(checked === true)}
          />
          <Label htmlFor="intake-review-acknowledged" className="text-sm font-normal leading-snug text-cc-muted">
            I understand that CaseCompass provides general legal education and research guidance and is not
            providing legal advice.
          </Label>
        </div>

        <Button type="button" size="lg" onClick={onConfirm} disabled={!acknowledged || submitting} className="rounded-full">
          {submitting ? "Confirming…" : "Confirm"}
        </Button>
      </div>
    </div>
  );
}
