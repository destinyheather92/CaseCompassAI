"use client";

import { Button } from "@/components/ui/button";

export interface IntakeRecoveryProps {
  message: string;
  onRetry: () => void;
  onReview: () => void;
}

/** Recoverable-error state. Answers already given are never cleared by reaching this screen — see stores/use-intake-store.ts's setError. */
export function IntakeRecovery({ message, onRetry, onReview }: IntakeRecoveryProps) {
  return (
    <div className="glass-card flex w-full max-w-md flex-col gap-4 rounded-2xl p-6 text-center">
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
