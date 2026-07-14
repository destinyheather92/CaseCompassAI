import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

type WarningCalloutProps = {
  title?: string;
  children: ReactNode;
};

export function WarningCallout({ title, children }: WarningCalloutProps) {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-2xl border-2 border-cc-teal/50 bg-cc-teal/[0.08] p-5 shadow-[0_0_24px_rgba(34,211,238,0.1)]"
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-cc-teal" strokeWidth={1.75} aria-hidden="true" />
      <div className="text-sm leading-relaxed text-cc-text">
        <p className="mb-1 text-xs font-bold tracking-wide text-cc-teal uppercase">{title ?? "Important"}</p>
        {children}
      </div>
    </div>
  );
}
