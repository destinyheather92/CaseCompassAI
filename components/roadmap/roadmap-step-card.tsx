"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { RoadmapDetailStep } from "@/lib/dashboard/get-roadmap-detail";
import type { RoadmapStepStatus, RoadmapStepPriority, RoadmapStepDifficulty } from "@/types/roadmap";

const STATUS_ORDER: RoadmapStepStatus[] = ["not-started", "in-progress", "completed"];
const STATUS_LABELS: Record<RoadmapStepStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  completed: "Completed",
};
const PRIORITY_LABELS: Record<RoadmapStepPriority, string> = {
  essential: "Essential",
  recommended: "Recommended",
  optional: "Optional",
};
const PRIORITY_VARIANTS: Record<RoadmapStepPriority, "default" | "secondary" | "outline"> = {
  essential: "default",
  recommended: "secondary",
  optional: "outline",
};
const DIFFICULTY_LABELS: Record<RoadmapStepDifficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
const SAFE_ERROR_MESSAGE = "Could not update this step right now.";
const SAFE_NOTE_ERROR_MESSAGE = "Could not save your note right now.";

export function RoadmapStepCard({ roadmapId, step }: { roadmapId: string; step: RoadmapDetailStep }) {
  const [status, setStatus] = useState<RoadmapStepStatus>(step.status);
  const [note, setNote] = useState(step.note ?? "");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);

  async function updateStatus(nextStatus: RoadmapStepStatus) {
    if (nextStatus === status || updating) return;
    const previous = status;
    setUpdating(true);
    setError(null);
    setStatus(nextStatus);
    try {
      const response = await fetch(`/api/dashboard/roadmap-progress/${roadmapId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stepId: step.id, status: nextStatus }),
      });
      const body = await response.json();
      if (body.status !== "updated") {
        setStatus(previous);
        setError(body.message ?? SAFE_ERROR_MESSAGE);
      }
    } catch {
      setStatus(previous);
      setError(SAFE_ERROR_MESSAGE);
    } finally {
      setUpdating(false);
    }
  }

  async function handleSaveNote() {
    setSavingNote(true);
    setNoteError(null);
    setNoteSaved(false);
    try {
      const response = await fetch(`/api/dashboard/roadmap-progress/${roadmapId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stepId: step.id, status, note }),
      });
      const body = await response.json();
      if (body.status !== "updated") {
        setNoteError(body.message ?? SAFE_NOTE_ERROR_MESSAGE);
        return;
      }
      setNoteSaved(true);
    } catch {
      setNoteError(SAFE_NOTE_ERROR_MESSAGE);
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-cc-muted uppercase">Step {step.order}</p>
        {status === "completed" && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-cc-teal">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Completed
          </span>
        )}
      </div>
      <h3 className="mt-1 text-base font-bold text-cc-text">{step.title}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant={PRIORITY_VARIANTS[step.priority]}>{PRIORITY_LABELS[step.priority]}</Badge>
        <Badge variant="outline">{DIFFICULTY_LABELS[step.difficulty]}</Badge>
        <span className="inline-flex items-center gap-1 text-xs text-cc-muted">
          <Clock className="size-3" aria-hidden="true" />
          {step.estimatedMinutes} min read
        </span>
      </div>

      <p className="mt-3 text-sm text-cc-muted">{step.description}</p>
      <p className="mt-2 text-xs text-cc-teal">{step.whyItMatters}</p>

      {step.suggestedActions.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {step.suggestedActions.map((action) => (
            <li key={action} className="text-sm text-cc-text">
              • {action}
            </li>
          ))}
        </ul>
      )}

      {step.relatedTerms.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {step.relatedTerms.map((term) => (
            <Link
              key={term}
              href={`/resources/legal-terms-glossary?term=${encodeURIComponent(term)}`}
              className="rounded-full border border-cc-purple/40 px-2.5 py-1 text-xs text-cc-purple hover:border-cc-purple hover:underline"
            >
              {term}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
        {STATUS_ORDER.map((candidate) => (
          <Button
            key={candidate}
            type="button"
            size="sm"
            variant={status === candidate ? "default" : "outline"}
            disabled={updating}
            aria-pressed={status === candidate}
            onClick={() => updateStatus(candidate)}
          >
            {STATUS_LABELS[candidate]}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <Label htmlFor={`note-${step.id}`} className="text-xs text-cc-muted">
          Private note (only visible to you)
        </Label>
        <Textarea
          id={`note-${step.id}`}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setNoteSaved(false);
          }}
          className="mt-1"
          rows={2}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleSaveNote} disabled={savingNote}>
            {savingNote ? "Saving…" : "Save Note"}
          </Button>
          <span role="status" aria-live="polite" className="text-xs text-cc-teal">
            {noteSaved ? "Note saved." : ""}
          </span>
        </div>
        {noteError && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {noteError}
          </p>
        )}
      </div>
    </div>
  );
}
