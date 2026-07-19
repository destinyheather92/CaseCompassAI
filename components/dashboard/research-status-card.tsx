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
    <div className="glass-card flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-cc-purple/50 bg-gradient-to-br from-cc-purple/20 to-cc-teal/10">
          <Compass className="size-5 text-cc-purple" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold tracking-wide text-cc-muted uppercase">Research Status</p>
          <p className="text-lg font-bold text-cc-text">{RESEARCH_STATUS_LABELS[researchStatus]}</p>
        </div>
      </div>
      <Link href={primaryAction.href} className={buttonVariants({ variant: "default", className: "shrink-0" })}>
        {primaryAction.label}
      </Link>
    </div>
  );
}
