"use client";

import { useEffect, useRef, useState } from "react";
import { Compass, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { IntakeQuestion } from "@/types/intake-interview";

export interface AdaptiveQuestionProps {
  question: IntakeQuestion;
  onSubmit: (answerText: string) => void;
  submitting: boolean;
}

const DONT_KNOW_ANSWER = "I don't know";
const QUESTION_HEADING_ID = "adaptive-question-heading";

/**
 * Renders whichever answer control fits the AI-supplied answerType. All
 * question/choice text comes from the model and is rendered as plain
 * React text content — never dangerouslySetInnerHTML — so it can never
 * be interpreted as markup, however it's phrased.
 *
 * The question text is rendered exactly once (the heading) and
 * associated with the answer control via `aria-labelledby` rather than a
 * second, visibly (and audibly, for screen readers) duplicated label.
 *
 * Callers must render this with `key={question.id}` — that's what resets
 * the local answer state between questions (React's recommended pattern
 * for "reset state when a prop changes," instead of a setState-in-effect
 * reset). This component's own effect only performs the imperative
 * focus move, which is what effects are actually for.
 */
export function AdaptiveQuestion({ question, onSubmit, submitting }: AdaptiveQuestionProps) {
  const [textValue, setTextValue] = useState("");
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [dontKnow, setDontKnow] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const typedAnswer =
    question.answerType === "single-choice" || question.answerType === "yes-no"
      ? selectedChoice
      : question.answerType === "multiple-choice"
        ? selectedChoices.join(", ")
        : textValue.trim();

  const answer = dontKnow ? DONT_KNOW_ANSWER : typedAnswer;
  const canSubmit = Boolean(answer) && !submitting;
  const controlsDisabled = submitting || dontKnow;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!answer) return;
    onSubmit(answer);
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={submitting}
      className="glass-card flex w-full max-w-2xl flex-col gap-6 rounded-3xl p-6 sm:p-8"
    >
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-cc-purple uppercase">
        <span className="flex size-6 items-center justify-center rounded-full border border-cc-purple/50 bg-gradient-to-br from-cc-purple/25 to-cc-teal/10">
          <Compass className="size-3.5" aria-hidden="true" strokeWidth={2} />
        </span>
        CaseCompass asks
      </div>

      <div>
        <h2 ref={headingRef} id={QUESTION_HEADING_ID} tabIndex={-1} className="text-2xl font-bold text-cc-text outline-none">
          {question.text}
        </h2>
        {question.sensitiveInformationWarning && (
          <p role="note" className="mt-3 flex items-start gap-2 rounded-xl border border-cc-teal/30 bg-cc-teal/[0.06] p-3 text-sm text-cc-muted">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-cc-teal" aria-hidden="true" />
            {question.sensitiveInformationWarning}
          </p>
        )}
      </div>

      {question.answerType === "short-text" && (
        <Input
          id="adaptive-answer"
          aria-labelledby={QUESTION_HEADING_ID}
          value={textValue}
          onChange={(event) => setTextValue(event.target.value)}
          disabled={controlsDisabled}
          className="h-12 rounded-xl px-4 text-base"
        />
      )}

      {question.answerType === "long-text" && (
        <Textarea
          id="adaptive-answer"
          aria-labelledby={QUESTION_HEADING_ID}
          value={textValue}
          onChange={(event) => setTextValue(event.target.value)}
          disabled={controlsDisabled}
          rows={5}
          className="rounded-xl p-4 text-base"
        />
      )}

      {question.answerType === "date" && (
        <Input
          id="adaptive-answer"
          aria-labelledby={QUESTION_HEADING_ID}
          type="date"
          value={textValue}
          onChange={(event) => setTextValue(event.target.value)}
          disabled={controlsDisabled}
          className="h-12 w-fit rounded-xl px-4 text-base"
        />
      )}

      {question.answerType === "yes-no" && (
        <div className="flex gap-3">
          {["Yes", "No"].map((label) => {
            const isSelected = selectedChoice === label;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedChoice(label)}
                disabled={controlsDisabled}
                className={cn(
                  "glass-card flex-1 rounded-xl px-6 py-4 text-center text-base font-semibold text-cc-text transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
                  isSelected
                    ? "bg-cc-purple/15 shadow-[0_0_0_2px_var(--color-cc-purple),0_0_24px_rgba(139,92,246,0.25)]"
                    : "hover:-translate-y-0.5 hover:bg-cc-purple/5 hover:shadow-[0_0_0_1px_var(--color-cc-purple)]",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {question.answerType === "single-choice" && question.choices && (
        <RadioGroup value={selectedChoice ?? undefined} onValueChange={setSelectedChoice} disabled={controlsDisabled} className="gap-2.5">
          {question.choices.map((choice, index) => {
            const isSelected = selectedChoice === choice;
            return (
              <Label
                key={choice}
                htmlFor={`single-choice-${index}`}
                className={cn(
                  "glass-card cursor-pointer rounded-xl p-3.5 font-normal transition-all duration-200",
                  controlsDisabled && "cursor-not-allowed opacity-50",
                  isSelected
                    ? "bg-cc-purple/15 shadow-[0_0_0_2px_var(--color-cc-purple)]"
                    : "hover:bg-cc-purple/5 hover:shadow-[0_0_0_1px_var(--color-cc-purple)]",
                )}
              >
                <RadioGroupItem value={choice} id={`single-choice-${index}`} />
                <span className="text-cc-text">{choice}</span>
              </Label>
            );
          })}
        </RadioGroup>
      )}

      {question.answerType === "multiple-choice" && question.choices && (
        <div className="flex flex-col gap-2.5">
          {question.choices.map((choice, index) => {
            const isChecked = selectedChoices.includes(choice);
            return (
              <Label
                key={choice}
                htmlFor={`multi-choice-${index}`}
                className={cn(
                  "glass-card cursor-pointer rounded-xl p-3.5 font-normal transition-all duration-200",
                  controlsDisabled && "cursor-not-allowed opacity-50",
                  isChecked
                    ? "bg-cc-purple/15 shadow-[0_0_0_2px_var(--color-cc-purple)]"
                    : "hover:bg-cc-purple/5 hover:shadow-[0_0_0_1px_var(--color-cc-purple)]",
                )}
              >
                <Checkbox
                  id={`multi-choice-${index}`}
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    setSelectedChoices((prev) => (checked ? [...prev, choice] : prev.filter((c) => c !== choice)))
                  }
                  disabled={controlsDisabled}
                />
                <span className="text-cc-text">{choice}</span>
              </Label>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-white/[0.06] pt-4">
        <Checkbox
          id="adaptive-dont-know"
          checked={dontKnow}
          onCheckedChange={(checked) => setDontKnow(checked === true)}
          disabled={submitting}
        />
        <Label htmlFor="adaptive-dont-know" className="font-normal text-cc-muted">
          I don&apos;t know
        </Label>
      </div>

      <Button type="submit" size="lg" disabled={!canSubmit} className="rounded-full">
        {submitting ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
