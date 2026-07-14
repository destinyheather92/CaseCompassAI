"use client";

import { motion } from "framer-motion";
import { featureItems, featuresContent } from "@/lib/site-data";

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-24 px-6 py-28 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-cc-text sm:text-4xl">
            {featuresContent.heading}
          </h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-cc-purple to-cc-teal" />
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-cc-muted">
            {featuresContent.intro}
          </p>
        </div>

        <ul className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {featureItems.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.li
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.6, delay: (i % 4) * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card group relative flex flex-col items-start rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-cc-purple/60 hover:shadow-[0_12px_40px_rgba(139,92,246,0.2)]"
              >
                <span className="mb-4 flex size-12 items-center justify-center rounded-xl border border-cc-purple/40 bg-cc-purple/10 text-cc-purple transition-colors duration-300 group-hover:border-cc-teal/60 group-hover:text-cc-teal group-hover:bg-cc-teal/10">
                  <Icon className="size-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className="text-base font-bold leading-snug text-cc-text">
                  {feature.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-cc-muted">
                  {feature.description}
                </p>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
