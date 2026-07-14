import Link from "next/link";
import { Compass } from "lucide-react";

type ResourceCTAProps = {
  heading: string;
  description: string;
  label: string;
  href?: string;
};

export function ResourceCTA({ heading, description, label, href = "/#get-started" }: ResourceCTAProps) {
  return (
    <section className="px-6 py-16 lg:px-10">
      <div className="glass-card mx-auto max-w-4xl rounded-3xl px-8 py-12 text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-cc-text sm:text-3xl">{heading}</h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-cc-muted">{description}</p>
        <div className="mt-8 flex justify-center">
          <Link
            href={href}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cc-purple to-cc-violet px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(139,92,246,0.35)] transition-all duration-300 hover:shadow-[0_0_44px_rgba(168,85,247,0.55)] hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-cc-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
          >
            <Compass
              className="size-4.5 transition-transform duration-500 group-hover:rotate-45"
              aria-hidden="true"
            />
            {label}
          </Link>
        </div>
      </div>
    </section>
  );
}
