"use client";

import { motion } from "framer-motion";
import { impactStats } from "@/lib/site-data";
import { AnimatedCounter } from "@/components/site/animated-counter";

export function ImpactStats() {
  return (
    <section className="relative px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card grid grid-cols-1 gap-10 rounded-3xl px-8 py-10 sm:grid-cols-3 sm:gap-6 sm:px-10 sm:py-12"
        >
          {impactStats.map((stat, i) => {
            const Icon = stat.icon;
            const isTeal = stat.accent === "teal";
            return (
              <div
                key={stat.label}
                className={`flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left ${
                  i > 0 ? "sm:border-l sm:border-cc-border sm:pl-6" : ""
                }`}
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${
                    isTeal
                      ? "border-cc-teal/40 bg-cc-teal/10 text-cc-teal"
                      : "border-cc-purple/40 bg-cc-purple/10 text-cc-purple"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <div className="text-3xl font-extrabold tracking-tight text-cc-text sm:text-4xl">
                    {stat.staticValue ? (
                      stat.staticValue
                    ) : (
                      <AnimatedCounter
                        to={stat.countTo ?? 0}
                        decimals={stat.decimals ?? 0}
                        suffix={stat.suffix}
                      />
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-snug text-cc-muted">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
