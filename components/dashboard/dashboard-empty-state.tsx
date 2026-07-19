import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function DashboardEmptyState() {
  return (
    <div className="glass-card flex flex-col items-center gap-4 rounded-2xl p-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full border border-cc-purple/50 bg-gradient-to-br from-cc-purple/20 to-cc-teal/10">
        <Compass className="size-6 text-cc-purple" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-lg font-bold text-cc-text">You haven&apos;t started an intake yet</h2>
        <p className="mt-1 max-w-md text-sm text-cc-muted">
          Answer a few questions about your situation and CaseCompass will build a personalized legal research
          roadmap for you.
        </p>
      </div>
      <Link href="/get-started" className={buttonVariants({ variant: "default" })}>
        Start Intake
      </Link>
    </div>
  );
}
