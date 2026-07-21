"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { IntakeProgress } from "@/components/onboarding/intake-progress";
import type { IntakeStep } from "@/stores/use-intake-store";

/**
 * Shared visual frame for the whole intake wizard: branded background
 * treatment (matching the marketing site's justice-tech language),
 * a slim top bar, the phase progress indicator, and a subtle per-step
 * entrance transition.
 *
 * Deliberately no exit animation / AnimatePresence — the entering step
 * mounts synchronously (only its opacity/position animate in), so
 * step-to-step navigation stays instantaneous for both real users
 * clicking through quickly and for tests asserting on the next step's
 * content immediately after a click.
 */
export function IntakeShell({ step, navBar, children }: { step: IntakeStep; navBar: ReactNode; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-cc-bg">
      <div aria-hidden="true" className="bg-grid-glow pointer-events-none absolute inset-0 opacity-30" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 12% -5%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(ellipse 55% 40% at 100% 25%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(ellipse 60% 50% at 50% 110%, rgba(139,92,246,0.08), transparent 60%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-8 items-center justify-center rounded-full border border-cc-purple/50 bg-gradient-to-br from-cc-purple/20 to-cc-teal/10">
            <Compass className="size-4 text-cc-purple" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="text-sm font-bold tracking-tight text-cc-text">
            CASECOMPASS<span className="text-cc-purple">AI</span>
          </span>
        </div>
        {navBar}
      </header>

      <div className="relative z-10 px-6 pb-1">
        <IntakeProgress step={step} />
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex w-full flex-col items-center"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
