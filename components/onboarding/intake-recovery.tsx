"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface IntakeRecoveryProps {
  message: string;
  onRetry: () => void;
  onReview: () => void;
}

/** Recoverable-error state. Answers already given are never cleared by reaching this screen — see stores/use-intake-store.ts's setError. */
export function IntakeRecovery({ message, onRetry, onReview }: IntakeRecoveryProps) {
  return (
    <div className="glass-card flex w-full max-w-md flex-col items-center gap-4 rounded-3xl p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10">
        <AlertTriangle className="size-5 text-amber-400" aria-hidden="true" strokeWidth={1.75} />
      </span>
      <p role="alert" className="text-sm text-cc-text">
        {message}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button type="button" onClick={onRetry}>
          Try Again
        </Button>
        <Button type="button" variant="outline" onClick={onReview}>
          Review My Answers
        </Button>
      </div>
    </div>
  );
}
