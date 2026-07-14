import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";

type ExampleCardProps = {
  title: string;
  children: ReactNode;
  fictional?: boolean;
};

export function ExampleCard({ title, children, fictional = false }: ExampleCardProps) {
  return (
    <div className="glass-card rounded-2xl border-cc-teal/30 p-6">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-cc-teal/40 bg-cc-teal/10 text-cc-teal">
          <Lightbulb className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold text-cc-text">{title}</h3>
        {fictional && (
          <span className="inline-flex items-center rounded-full border border-cc-border bg-cc-bg-secondary/60 px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-cc-muted uppercase">
            Fictional example
          </span>
        )}
      </div>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-cc-muted">{children}</div>
    </div>
  );
}
