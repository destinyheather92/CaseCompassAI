"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { Compass, Lock, Play } from "lucide-react";
import { HeroRoadmapVisual, MobileRoadmapBlock } from "@/components/site/hero-roadmap-visual";
import { DemoVideoModal } from "@/components/site/demo-video-modal";

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: EASE },
  }),
};

function BackgroundPhoto() {
  return (
    <div className="absolute inset-0 z-0">
      <Image
        src="/images/hero-background.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-top"
      />
    </div>
  );
}

function HeroCopy() {
  return (
    <div>
      <motion.p
        initial="hidden"
        animate="show"
        custom={0}
        variants={fadeUp}
        className="mb-6 text-xs font-semibold tracking-[0.2em] text-cc-muted uppercase"
      >
        Knowledge is <span className="text-cc-purple">power</span>. Direction is{" "}
        <span className="text-cc-teal">freedom</span>.
      </motion.p>

      <motion.h1
        initial="hidden"
        animate="show"
        custom={0.1}
        variants={fadeUp}
        className="text-4xl font-extrabold leading-[1.08] tracking-tight text-cc-text sm:text-5xl lg:text-[3.4rem]"
      >
        When you don&rsquo;t know where to start,{" "}
        <span
          className="text-gradient-headline animate-headline-sweep inline-block"
          style={{ animationDelay: "1s" }}
        >
          CaseCompass
        </span>{" "}
        shows you the path forward.
      </motion.h1>

      <motion.p
        initial="hidden"
        animate="show"
        custom={0.22}
        variants={fadeUp}
        className="mt-6 max-w-lg text-lg leading-relaxed text-cc-muted"
      >
        Personalized legal research roadmaps that help incarcerated individuals
        understand what to research and where to begin.
      </motion.p>

      <motion.div
        initial="hidden"
        animate="show"
        custom={0.34}
        variants={fadeUp}
        className="mt-9 flex flex-col gap-4 sm:flex-row"
      >
        <Link
          href="/get-started"
          className="group pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cc-purple to-cc-violet px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(139,92,246,0.35)] transition-all duration-300 hover:shadow-[0_0_44px_rgba(168,85,247,0.55)] hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-cc-teal focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
        >
          <Compass
            className="size-4.5 transition-transform duration-500 group-hover:rotate-45"
            aria-hidden="true"
          />
          Build My Research Roadmap
        </Link>
        <DemoVideoModal
          videoSrc="/demos/individual-user-demo.mp4"
          posterSrc="/demos/individual-user-demo-poster.jpg"
          title="60-Second Individual Demo"
          description="A walkthrough of the individual-user experience: logging in, building a research roadmap, and viewing verified cases and plain-language explanations."
          trigger={
            <button
              type="button"
              className="pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full border border-cc-purple/40 bg-cc-bg-secondary/60 px-7 py-3.5 text-sm font-semibold text-cc-text transition-all duration-300 hover:border-cc-purple/80 hover:bg-white/[0.03] outline-none focus-visible:ring-2 focus-visible:ring-cc-purple focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
            >
              <Play className="size-4" aria-hidden="true" />
              Watch 60 Second Demo
            </button>
          }
        />
      </motion.div>

      <motion.p
        initial="hidden"
        animate="show"
        custom={0.46}
        variants={fadeUp}
        className="mt-6 flex items-center gap-2 text-sm text-cc-muted"
      >
        <Lock className="size-4 text-cc-teal" aria-hidden="true" />
        100% Private. No legal advice. Just guidance.
      </motion.p>
    </div>
  );
}

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* ============ Desktop: single full-bleed 950px photo hero ============ */}
      <div className="relative hidden lg:block lg:h-[950px]">
        <BackgroundPhoto />

        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(90deg, rgba(2,3,8,0.92) 0%, rgba(2,3,8,0.78) 30%, rgba(2,3,8,0.35) 58%, rgba(2,3,8,0.15) 78%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        <div className="absolute inset-0 z-20">
          <HeroRoadmapVisual />
        </div>

        <div className="pointer-events-none relative z-30 flex h-full items-center">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-12 px-10">
            <HeroCopy />
            <div aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* ============ Mobile / tablet: stacked layout ============ */}
      <div className="lg:hidden">
        <div className="relative overflow-hidden pt-28 pb-16">
          <BackgroundPhoto />
          <div
            className="absolute inset-0 z-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(2,3,8,0.6) 0%, rgba(2,3,8,0.45) 45%, rgba(2,3,8,0.9) 90%, #050712 100%)",
            }}
            aria-hidden="true"
          />
          <div className="relative z-20 px-6 sm:px-10">
            <HeroCopy />
          </div>
        </div>

        <div className="relative overflow-hidden bg-cc-bg py-4">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(139,92,246,0.12), transparent 65%)",
            }}
            aria-hidden="true"
          />
          <MobileRoadmapBlock />
        </div>
      </div>
    </section>
  );
}
