"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import { facilityAudiences, facilityBenefits, facilitiesContent } from "@/lib/site-data";

export function ForFacilities() {
  return (
    <section id="facilities" className="relative scroll-mt-24 px-6 py-28 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-cc-text sm:text-4xl">
            {facilitiesContent.heading}
          </h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-cc-purple to-cc-teal" />
        </div>

        <motion.ul
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-3"
        >
          {facilityAudiences.map((audience) => {
            const Icon = audience.icon;
            return (
              <li
                key={audience.label}
                className="flex items-center gap-2 rounded-full border border-cc-border bg-cc-card px-4 py-2 text-sm font-medium text-cc-muted"
              >
                <Icon className="size-4 text-cc-purple" strokeWidth={1.75} aria-hidden="true" />
                {audience.label}
              </li>
            );
          })}
        </motion.ul>

        <ul className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {facilityBenefits.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <motion.li
                key={benefit.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="glass-card group flex items-center gap-4 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cc-purple/60 hover:shadow-[0_12px_40px_rgba(139,92,246,0.2)]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-cc-teal/40 bg-cc-teal/10 text-cc-teal transition-colors duration-300 group-hover:border-cc-purple/60 group-hover:text-cc-purple group-hover:bg-cc-purple/10">
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className="text-sm font-bold leading-snug text-cc-text">
                  {benefit.label}
                </h3>
              </motion.li>
            );
          })}
        </ul>

        <div className="mt-14 flex justify-center">
          <Link
            href="/institution/register"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cc-purple to-cc-violet px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(139,92,246,0.35)] transition-all duration-300 hover:shadow-[0_0_44px_rgba(168,85,247,0.55)] hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-cc-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
          >
            <Building2
              className="size-4.5 transition-transform duration-500 group-hover:rotate-6"
              aria-hidden="true"
            />
            {facilitiesContent.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
