import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function DashboardEmptyState() {
  return (
    <div className="glass-card flex flex-col items-center gap-5 rounded-3xl p-12 text-center sm:p-16">
      <span className="flex size-16 items-center justify-center rounded-2xl border border-cc-purple/50 bg-gradient-to-br from-cc-purple/25 to-cc-teal/10">
        <Compass className="size-7 text-cc-purple" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-xl font-bold text-cc-text">You haven&apos;t started an intake yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-cc-muted">
          Answer a few questions about your situation and CaseCompass will build a personalized legal research
          roadmap for you.
        </p>
      </div>
      <Link href="/get-started" className={buttonVariants({ variant: "default", className: "h-11 px-7" })}>
        Start Intake
      </Link>
    </div>
  );
}
