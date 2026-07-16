"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl flex-col gap-6" aria-busy={submitting}>
      <div>
        <h2 ref={headingRef} id={QUESTION_HEADING_ID} tabIndex={-1} className="text-2xl font-bold text-cc-text outline-none">
          {question.text}
        </h2>
        {question.sensitiveInformationWarning && (
          <p role="note" className="mt-2 text-sm text-cc-muted">
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
        />
      )}

      {question.answerType === "yes-no" && (
        <div className="flex gap-3">
          {["Yes", "No"].map((label) => (
            <Button
              key={label}
              type="button"
              variant={selectedChoice === label ? "default" : "outline"}
              onClick={() => setSelectedChoice(label)}
              disabled={controlsDisabled}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {question.answerType === "single-choice" && question.choices && (
        <RadioGroup value={selectedChoice ?? undefined} onValueChange={setSelectedChoice} disabled={controlsDisabled}>
          {question.choices.map((choice, index) => (
            // Choice text can contain spaces/punctuation, which is not
            // valid inside an HTML id — index-based ids keep the
            // id/aria-labelledby association valid regardless of content.
            <div key={choice} className="flex items-center gap-2">
              <RadioGroupItem value={choice} id={`single-choice-${index}`} />
              <Label htmlFor={`single-choice-${index}`}>{choice}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {question.answerType === "multiple-choice" && question.choices && (
        <div className="flex flex-col gap-2">
          {question.choices.map((choice, index) => (
            <div key={choice} className="flex items-center gap-2">
              <Checkbox
                id={`multi-choice-${index}`}
                checked={selectedChoices.includes(choice)}
                onCheckedChange={(checked) =>
                  setSelectedChoices((prev) => (checked ? [...prev, choice] : prev.filter((c) => c !== choice)))
                }
                disabled={controlsDisabled}
              />
              <Label htmlFor={`multi-choice-${index}`}>{choice}</Label>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-cc-border pt-4">
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

      <Button type="submit" disabled={!canSubmit}>
        {submitting ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
