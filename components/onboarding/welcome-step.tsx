"use client";

import { Button } from "@/components/ui/button";

export interface WelcomeStepProps {
  hasSavedProgress: boolean;
  onStart: () => void;
  onResume: () => void;
  onStartOver: () => void;
}

export function WelcomeStep({ hasSavedProgress, onStart, onResume, onStartOver }: WelcomeStepProps) {
  return (
    <div className="glass-card flex w-full max-w-xl flex-col gap-4 rounded-2xl p-8 text-center">
      <h1 className="text-3xl font-extrabold text-cc-text">Let&apos;s build your legal research roadmap.</h1>
      <p className="text-cc-muted">
        Answer a few simple questions so CaseCompass can understand your situation and recommend where to begin
        your research.
      </p>
      <p className="text-sm text-cc-muted">
        CaseCompass provides educational legal research guidance, not legal advice.
      </p>

      {hasSavedProgress ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" onClick={onResume}>
            Continue where I left off
          </Button>
          <Button type="button" variant="outline" onClick={onStartOver}>
            Start over
          </Button>
        </div>
      ) : (
        <Button type="button" className="mt-2 self-center" onClick={onStart}>
          Get Started
        </Button>
      )}
    </div>
  );
}
