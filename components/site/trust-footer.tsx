import { Compass } from "lucide-react";
import { trustItems } from "@/lib/site-data";

export function TrustFooter() {
  return (
    <footer className="px-6 pb-12 pt-24 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-cc-purple/30 bg-cc-purple/[0.06] text-cc-teal">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-cc-text">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-cc-muted">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 flex flex-col items-center gap-4 border-t border-white/[0.06] pt-8 text-center">
          <div className="flex items-center gap-2 text-cc-muted">
            <Compass className="size-4 text-cc-purple/70" aria-hidden="true" />
            <span className="text-sm font-semibold tracking-tight">
              CASECOMPASS<span className="text-cc-purple">AI</span>
            </span>
          </div>
          <p className="text-xs text-cc-muted/70">
            &copy; {new Date().getFullYear()} CaseCompass AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
