import { ExternalLink, Landmark } from "lucide-react";
import type { LegalSource } from "@/lib/legal-sources/types";

const SOURCE_TYPE_LABEL: Record<LegalSource["sourceType"], string> = {
  official: "Official Source",
  "cornell-lii": "Cornell LII",
  "case-law-database": "Case Law Database",
  "licensed-provider": "Licensed Provider",
  curated: "Curated",
};

export function LegalSourceCard({ title, url, sourceType }: LegalSource) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-xl border border-cc-border bg-cc-card px-4 py-3 transition-colors duration-300 hover:border-cc-purple/60 outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-cc-purple/30 bg-cc-purple/[0.06] text-cc-purple">
        <Landmark className="size-4" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.65rem] font-semibold tracking-wide text-cc-muted uppercase">
          {SOURCE_TYPE_LABEL[sourceType]}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-cc-text">
          <span className="truncate">{title}</span>
          <ExternalLink
            className="size-3.5 shrink-0 text-cc-muted transition-colors group-hover:text-cc-teal"
            aria-hidden="true"
          />
        </span>
      </span>
    </a>
  );
}
