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
        <h2 className="text-xl font-bold text-cc-text">You have not created a matter yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-cc-muted">
          Start a new matter to build your personalized legal research roadmap.
        </p>
      </div>
      <Link href="/get-started" className={buttonVariants({ variant: "default", className: "h-11 px-7" })}>
        New Matter
      </Link>
    </div>
  );
}
