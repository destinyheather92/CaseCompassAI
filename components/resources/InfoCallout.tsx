import type { ReactNode } from "react";
import { Info } from "lucide-react";

type InfoCalloutProps = {
  title?: string;
  children: ReactNode;
};

export function InfoCallout({ title, children }: InfoCalloutProps) {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-2xl border border-cc-purple/30 bg-cc-purple/[0.06] p-5"
    >
      <Info className="mt-0.5 size-5 shrink-0 text-cc-purple" strokeWidth={1.75} aria-hidden="true" />
      <div className="text-sm leading-relaxed text-cc-muted">
        {title && <p className="mb-1 font-bold text-cc-text">{title}</p>}
        {children}
      </div>
    </div>
  );
}
