"use client";

import { motion } from "framer-motion";
import { CircleCheckBig } from "lucide-react";
import { aboutContent } from "@/lib/site-data";

export function About() {
  return (
    <section id="about" className="relative scroll-mt-24 px-6 py-28 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-cc-text sm:text-4xl">
            {aboutContent.heading}
          </h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-cc-purple to-cc-teal" />
        </div>

        <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            {aboutContent.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-base leading-relaxed text-cc-muted">
                {paragraph}
              </p>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-3xl p-8"
          >
            <p className="text-sm font-semibold tracking-wide text-cc-text uppercase">
              CaseCompass helps users
            </p>
            <ul className="mt-5 space-y-3">
              {aboutContent.helpsPoints.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CircleCheckBig
                    className="mt-0.5 size-5 shrink-0 text-cc-teal"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="text-base leading-relaxed text-cc-muted capitalize">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-white/[0.06] pt-6">
              <p className="text-base leading-relaxed text-cc-text italic">
                {aboutContent.mission}
              </p>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-16 text-center text-xl font-bold tracking-tight text-cc-text sm:text-2xl"
        >
          Knowledge is <span className="text-cc-purple">Power</span>.{" "}
          Direction is <span className="text-cc-teal">Freedom</span>.
        </motion.p>
      </div>
    </section>
  );
}
