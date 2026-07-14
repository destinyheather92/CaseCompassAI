"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate, useReducedMotion } from "framer-motion";
import { useHasMounted } from "@/lib/use-has-mounted";

type AnimatedCounterProps = {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
};

export function AnimatedCounter({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  duration = 1.6,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const prefersReducedMotionRaw = useReducedMotion();
  const hasMounted = useHasMounted();
  const prefersReducedMotion = hasMounted ? prefersReducedMotionRaw : false;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView || prefersReducedMotion) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setDisplay(value),
    });
    return () => controls.stop();
  }, [isInView, to, duration, prefersReducedMotion]);

  const shown = prefersReducedMotion ? to : display;

  return (
    <motion.span ref={ref} className={className}>
      {prefix}
      {shown.toFixed(decimals)}
      {suffix}
    </motion.span>
  );
}
