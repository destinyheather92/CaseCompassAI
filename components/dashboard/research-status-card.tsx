import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RESEARCH_STATUS_LABELS } from "@/lib/dashboard/research-status-labels";
import type { ResearchStatus, PrimaryAction } from "@/lib/dashboard/research-status";

export function ResearchStatusCard({
  researchStatus,
  primaryAction,
}: {
  researchStatus: ResearchStatus;
  primaryAction: PrimaryAction;
}) {
  return (
    <div className="glass-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 100% at 100% 0%, rgba(139,92,246,0.14), transparent 65%)" }}
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-cc-purple/50 bg-gradient-to-br from-cc-purple/25 to-cc-teal/10">
            <Compass className="size-6 text-cc-purple" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-wide text-cc-muted uppercase">Research Status</p>
            <p className="mt-0.5 text-xl font-bold text-cc-text">{RESEARCH_STATUS_LABELS[researchStatus]}</p>
          </div>
        </div>
        <Link href={primaryAction.href} className={buttonVariants({ variant: "default", className: "shrink-0 h-11 px-6" })}>
          {primaryAction.label}
        </Link>
      </div>
    </div>
  );
}
