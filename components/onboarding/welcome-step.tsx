"use client";

import { Clock, ShieldCheck, MessagesSquare, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WelcomeStepProps {
  hasSavedProgress: boolean;
  onStart: () => void;
  onResume: () => void;
  onStartOver: () => void;
}

const EXPECTATIONS = [
  { icon: Clock, text: "Takes about 5–10 minutes" },
  { icon: MessagesSquare, text: "A few adaptive questions, one at a time" },
  { icon: ShieldCheck, text: "Educational guidance only — never legal advice" },
];

export function WelcomeStep({ hasSavedProgress, onStart, onResume, onStartOver }: WelcomeStepProps) {
  return (
    <div className="glass-card relative flex w-full max-w-xl flex-col items-center gap-5 overflow-hidden rounded-3xl p-8 text-center sm:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-70"
        style={{ background: "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(139,92,246,0.22), transparent 70%)" }}
      />

      <span className="relative flex size-14 items-center justify-center rounded-full border border-cc-purple/50 bg-gradient-to-br from-cc-purple/25 to-cc-teal/10 shadow-[0_0_30px_rgba(139,92,246,0.25)]">
        <Compass className="size-6 text-cc-purple" strokeWidth={1.75} aria-hidden="true" />
      </span>

      <h1 className="relative text-3xl font-extrabold text-cc-text">Let&apos;s build your legal research roadmap.</h1>
      <p className="relative max-w-md text-cc-muted">
        Answer a few simple questions so CaseCompass can understand your situation and recommend where to begin
        your research.
      </p>

      <ul className="relative grid w-full grid-cols-1 gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left sm:grid-cols-3 sm:gap-3">
        {EXPECTATIONS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5 sm:flex-col sm:items-start sm:gap-2">
            <Icon className="size-4 shrink-0 text-cc-teal" aria-hidden="true" />
            <span className="text-xs text-cc-muted">{text}</span>
          </li>
        ))}
      </ul>

      <p className="relative text-xs text-cc-muted">
        CaseCompass provides educational legal research guidance, not legal advice.
      </p>

      {hasSavedProgress ? (
        <div className="relative mt-1 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onResume}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cc-purple to-cc-violet px-6 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.3)] transition-all duration-300 hover:shadow-[0_0_36px_rgba(168,85,247,0.5)] hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-cc-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
          >
            Continue where I left off
          </button>
          <Button type="button" variant="outline" onClick={onStartOver}>
            Start over
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="group relative mt-1 inline-flex items-center justify-center gap-2 self-center rounded-full bg-gradient-to-r from-cc-purple to-cc-violet px-8 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(139,92,246,0.35)] transition-all duration-300 hover:shadow-[0_0_44px_rgba(168,85,247,0.55)] hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-cc-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
        >
          <Compass className="size-4 transition-transform duration-500 group-hover:rotate-45" aria-hidden="true" />
          Get Started
        </button>
      )}
    </div>
  );
}
