import { ShieldCheck } from "lucide-react";
import { RESOURCE_DISCLAIMER } from "@/lib/resources-constants";

export function LegalDisclaimer() {
  return (
    <section className="px-6 pb-16 lg:px-10">
      <div className="mx-auto flex max-w-4xl gap-3 rounded-2xl border border-cc-border bg-cc-bg-secondary/60 p-5">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-cc-teal" strokeWidth={1.75} aria-hidden="true" />
        <p className="text-xs leading-relaxed text-cc-muted">{RESOURCE_DISCLAIMER}</p>
      </div>
    </section>
  );
}
