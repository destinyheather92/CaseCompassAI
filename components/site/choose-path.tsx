"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { User, Building2, ArrowRight } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

const PATHS = [
  {
    icon: User,
    title: "Individual User",
    description: "Research your own case and receive a personalized legal research roadmap.",
    cta: "Get Started",
    href: "/get-started",
  },
  {
    icon: Building2,
    title: "Correctional Facility / Institution",
    description: "Manage incarcerated users, monitor research activity, and provide educational legal resources.",
    cta: "Get Started",
    href: "/institution/register",
  },
] as const;

/**
 * The first fork in the entire product: every visitor picks one of two
 * distinct onboarding paths right here, before anything else asks who
 * they are. Individual -> /get-started (the existing guided intake).
 * Institution -> /institution/register (self-service facility
 * registration, distinct from the individual sign-up flow entirely).
 */
export function ChoosePath() {
  return (
    <section id="choose-path" className="relative scroll-mt-24 px-6 py-20 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-cc-text sm:text-3xl">How will you use CaseCompass?</h2>
          <p className="mt-3 text-sm text-cc-muted">Choose the path that fits you — you can always reach the other from here later.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {PATHS.map((path, i) => {
            const Icon = path.icon;
            return (
              <motion.div
                key={path.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
                className="glass-card group flex flex-col items-start gap-4 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 hover:border-cc-purple/60 hover:shadow-[0_12px_40px_rgba(139,92,246,0.2)]"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-cc-purple/50 bg-gradient-to-br from-cc-purple/25 to-cc-teal/10 text-cc-purple">
                  <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className="text-lg font-bold text-cc-text">{path.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-cc-muted">{path.description}</p>
                <Link
                  href={path.href}
                  className="group/cta inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cc-purple to-cc-violet px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300 hover:shadow-[0_0_32px_rgba(168,85,247,0.5)] outline-none focus-visible:ring-2 focus-visible:ring-cc-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
                >
                  {path.cta}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover/cta:translate-x-0.5" aria-hidden="true" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
