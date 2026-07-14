import { Compass } from "lucide-react";

export function LegalDisclaimer() {
  return (
    <section className="px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div
          className="relative overflow-hidden rounded-3xl border border-transparent bg-cc-bg-secondary/60 px-8 py-12 sm:px-12"
          style={{
            borderImage:
              "linear-gradient(90deg, rgba(139,92,246,0.6), rgba(34,211,238,0.6)) 1",
          }}
        >
          <Compass
            className="pointer-events-none absolute -left-6 -top-6 size-40 text-cc-purple/[0.06]"
            strokeWidth={1}
            aria-hidden="true"
          />

          <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="text-2xl font-extrabold tracking-tight text-cc-text sm:text-3xl">
                We don&rsquo;t give legal advice.
              </p>
              <p
                className="mt-1 text-3xl text-cc-teal sm:text-4xl"
                style={{ fontFamily: "var(--font-script)" }}
              >
                We give you direction.
              </p>
            </div>
            <p className="text-sm leading-relaxed text-cc-muted lg:text-base">
              CaseCompass AI is an educational research tool, not a substitute
              for an attorney. We do not provide legal advice or represent
              you in any legal matter.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
