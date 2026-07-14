"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  animate,
} from "framer-motion";
import { roadmapMarkers, type RoadmapMarker } from "@/lib/site-data";
import { useHasMounted } from "@/lib/use-has-mounted";

type Point = { x: number; y: number };

type Variant = {
  id: string;
  bookWidthClass: string;
  bookCentered: boolean;
  bookRight?: string;
  bookBottom: string;
  seam: Point;
  nodes: Point[];
};

/**
 * All coordinates are percentages (0-100) of each variant's own container.
 * `seam` is only a first-paint fallback — the real value is measured live
 * off the rendered book image (see BOOK_SEAM_FRACTION below) so the path
 * always terminates at the book's actual center seam at any viewport size,
 * not just the width these were eyeballed against.
 *
 * Desktop: book pinned `right:12% / bottom:-40px` inside the full 950px
 * hero, climbing toward the prison window in hero-background.webp (~71%, 11%).
 *
 * Compact (tablet/mobile): a self-contained block below the text, not tied
 * to the hero photo, so the book sits centered and the path simply climbs to
 * the top of its own box.
 *
 * Book width is fluid (clamp) rather than snapping between fixed
 * breakpoints, so it scales continuously with the viewport.
 */
const desktopVariant: Variant = {
  id: "desktop",
  bookWidthClass: "w-[clamp(360px,34vw,560px)]",
  bookCentered: false,
  bookRight: "12%",
  bookBottom: "-40px",
  seam: { x: 68, y: 89 },
  nodes: [
    { x: 65, y: 76 },
    { x: 74, y: 60 },
    { x: 62, y: 45 },
    { x: 74, y: 28 },
    { x: 70, y: 11 },
  ],
};

const compactVariant: Variant = {
  id: "compact",
  bookWidthClass: "w-[clamp(260px,68vw,420px)]",
  bookCentered: true,
  bookBottom: "-20px",
  seam: { x: 50, y: 90 },
  nodes: [
    { x: 36, y: 73 },
    { x: 61, y: 56 },
    { x: 36, y: 39 },
    { x: 60, y: 22 },
    { x: 50, y: 8 },
  ],
};

/**
 * Where the book's glowing center seam sits within the *rendered* book
 * image, as a fraction of its own box (measured directly off
 * law-book.png: ~50.3% across, ~64.3% down). Combined with the book
 * element's live bounding box, this is how the path endpoint is pinned to
 * the actual artwork instead of a hand-tuned guess.
 */
const BOOK_SEAM_FRACTION: Point = { x: 0.503, y: 0.643 };

/**
 * Point order runs from the window-side node down to the book (seam), so the
 * animation's t=0 -> t=1 sweep travels top -> bottom, starting at the top of
 * the roadmap on load and arriving at the book.
 */
function buildPathD(v: Variant) {
  const pts = [...v.nodes].reverse().concat(v.seam);
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const midY = (prev.y + cur.y) / 2;
    d += ` C${prev.x},${midY} ${cur.x},${midY} ${cur.x},${cur.y}`;
  }
  return d;
}

const TOTAL_DURATION = 6.5;
const START_DELAY = 1.1;

const labelShadow = {
  textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 1px 12px rgba(0,0,0,0.7)",
};

function NodeLabel({
  active,
  hovered,
  text,
  tealFinal,
}: {
  active: boolean;
  hovered: boolean;
  text: string;
  tealFinal: boolean;
}) {
  const [done, setDone] = useState(false);

  if (hovered) {
    return (
      <span className={tealFinal ? "text-cc-teal" : "text-cc-text"} style={labelShadow}>
        {text}
      </span>
    );
  }

  if (!active) {
    return (
      <span className="text-white/55" style={labelShadow}>
        {text}
      </span>
    );
  }

  if (done) {
    return (
      <span className={tealFinal ? "text-cc-teal" : "text-cc-text"} style={labelShadow}>
        {text}
      </span>
    );
  }

  return (
    <span
      className="text-sweep-label animate-label-sweep"
      style={labelShadow}
      onAnimationEnd={() => setDone(true)}
    >
      {text}
    </span>
  );
}

function RoadmapNode({
  marker,
  point,
  isActive,
  isFinal,
}: {
  marker: RoadmapMarker;
  point: Point;
  isActive: boolean;
  isFinal: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = marker.icon;
  const labelSide = point.x > 55 ? "right" : "left";
  const lit = isActive || hovered;
  const accent = isFinal ? "teal" : "purple";

  return (
    <div
      className="pointer-events-auto absolute z-40 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* soft glow burst behind the node on hover */}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition-opacity duration-500 ${
          hovered ? "opacity-100" : "opacity-0"
        } ${accent === "teal" ? "bg-cc-teal/30" : "bg-cc-purple/30"}`}
        aria-hidden="true"
      />

      <div
        className={`flex items-center gap-2.5 ${labelSide === "left" ? "flex-row-reverse" : ""}`}
      >
        <motion.div
          key={isActive ? `${marker.label}-on` : `${marker.label}-off`}
          initial={{ scale: isActive ? 0.85 : 1 }}
          animate={{
            scale: isActive ? [0.85, 1.2, 1] : hovered ? 1.22 : 1,
            rotate: hovered ? 12 : 0,
          }}
          transition={{ duration: isActive ? 0.5 : 0.35, ease: "easeOut" }}
          className={`relative flex size-9 shrink-0 items-center justify-center rounded-full border backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] duration-300 sm:size-10 ${
            lit
              ? accent === "teal"
                ? "border-cc-teal bg-cc-teal/15 text-cc-teal shadow-[0_0_22px_rgba(34,211,238,0.75)]"
                : "border-cc-purple bg-cc-purple/15 text-cc-purple shadow-[0_0_22px_rgba(139,92,246,0.7)]"
              : "border-white/15 bg-black/30 text-white/30"
          }`}
        >
          {hovered && (
            <motion.span
              initial={{ scale: 0.75, opacity: 0.7 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
              className={`pointer-events-none absolute inset-0 rounded-full ${
                accent === "teal" ? "bg-cc-teal/60" : "bg-cc-purple/60"
              }`}
              aria-hidden="true"
            />
          )}
          <Icon className="relative size-4 sm:size-4.5" strokeWidth={1.75} aria-hidden="true" />
        </motion.div>
        <span
          className={`max-w-[7rem] text-[0.62rem] font-semibold uppercase leading-tight tracking-wide transition-transform duration-300 sm:max-w-[8.5rem] sm:text-[0.68rem] ${
            hovered ? "scale-105" : ""
          } ${labelSide === "left" ? "text-right" : "text-left"}`}
        >
          <NodeLabel active={isActive} hovered={hovered} text={marker.label} tealFinal={isFinal} />
        </span>
      </div>
    </div>
  );
}

/** Desktop-only: absolutely fills its parent (the 950px hero). */
export function HeroRoadmapVisual() {
  return <RoadmapScene variant={desktopVariant} />;
}

/** Tablet/mobile: a self-contained block placed in normal flow below the text. */
export function MobileRoadmapBlock() {
  return (
    <div className="relative h-[clamp(380px,62vw,480px)] w-full">
      <RoadmapScene variant={compactVariant} />
    </div>
  );
}

function RoadmapScene({ variant }: { variant: Variant }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bookWrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-10% 0px" });

  const prefersReducedMotionRaw = useReducedMotion();
  const hasMounted = useHasMounted();
  const prefersReducedMotion = hasMounted ? prefersReducedMotionRaw : false;

  const topStart = variant.nodes[variant.nodes.length - 1];

  const progress = useMotionValue(0);
  const orbX = useMotionValue(topStart.x);
  const orbY = useMotionValue(topStart.y);
  const orbOpacity = useMotionValue(0);

  const [activeFlags, setActiveFlags] = useState<boolean[]>(() => variant.nodes.map(() => false));
  const [journeyComplete, setJourneyComplete] = useState(false);

  // Falls back to the tuned static estimate for first paint, then snaps to
  // the book's real measured seam once mounted and on every resize — this
  // is what keeps the path landing exactly on the book at any viewport size.
  const [seam, setSeam] = useState<Point>(variant.seam);

  useEffect(() => {
    const container = containerRef.current;
    const bookEl = bookWrapRef.current;
    if (!container || !bookEl) return;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const bookRect = bookEl.getBoundingClientRect();
      if (containerRect.width === 0 || containerRect.height === 0) return;

      const seamXPx = bookRect.left - containerRect.left + bookRect.width * BOOK_SEAM_FRACTION.x;
      const seamYPx = bookRect.top - containerRect.top + bookRect.height * BOOK_SEAM_FRACTION.y;

      setSeam({
        x: (seamXPx / containerRect.width) * 100,
        y: (seamYPx / containerRect.height) * 100,
      });
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    resizeObserver.observe(bookEl);

    return () => resizeObserver.disconnect();
  }, []);

  const pathD = buildPathD({ ...variant, seam });
  const nodeThresholds = useRef<number[]>([]);
  const totalLength = useRef(0);

  useEffect(() => {
    if (!pathRef.current) return;
    const len = pathRef.current.getTotalLength();
    totalLength.current = len;

    const steps = 600;
    const findClosestT = (target: Point) => {
      let bestT = 0;
      let bestDist = Infinity;
      for (let i = 0; i <= steps; i++) {
        const l = (i / steps) * len;
        const p = pathRef.current!.getPointAtLength(l);
        const dist = (p.x - target.x) ** 2 + (p.y - target.y) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          bestT = l / len;
        }
      }
      return bestT;
    };
    nodeThresholds.current = variant.nodes.map((n) => findClosestT(n));
    // Re-measure whenever the path geometry actually changes (i.e. the
    // measured seam moved), not just once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathD]);

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      orbOpacity.set(0);
      progress.set(1);
      return;
    }

    orbOpacity.set(1);
    const controls = animate(progress, 1, {
      duration: TOTAL_DURATION,
      delay: START_DELAY,
      ease: [0.4, 0.05, 0.25, 1],
      onUpdate: (v) => {
        const len = totalLength.current;
        if (!pathRef.current || len === 0) return;
        const point = pathRef.current.getPointAtLength(v * len);
        orbX.set(point.x);
        orbY.set(point.y);

        setActiveFlags((prev) => {
          let changed = false;
          const next = prev.map((flag, idx) => {
            if (flag) return true;
            if (v >= nodeThresholds.current[idx]) {
              changed = true;
              return true;
            }
            return false;
          });
          return changed ? next : prev;
        });
      },
      onComplete: () => {
        orbOpacity.set(0);
        setJourneyComplete(true);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView, prefersReducedMotion]);

  const orbGlowOpacity = useTransform(progress, [0, 0.02, 0.98, 1], [0, 1, 1, 0]);
  const orbLeft = useTransform(orbX, (v) => `${v}%`);
  const orbTop = useTransform(orbY, (v) => `${v}%`);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
      {/* book */}
      <div
        ref={bookWrapRef}
        className={`absolute z-20 ${variant.bookWidthClass} ${
          variant.bookCentered ? "left-1/2 -translate-x-1/2" : ""
        }`}
        style={{
          right: variant.bookCentered ? undefined : variant.bookRight,
          bottom: variant.bookBottom,
        }}
      >
        <motion.div
          className="absolute left-1/2 top-[55%] h-1/3 w-2/3 -translate-x-1/2 rounded-full bg-cc-purple/30 blur-3xl"
          animate={
            journeyComplete
              ? { opacity: [0.5, 0.95, 0.5] }
              : { opacity: 0.5 }
          }
          transition={
            journeyComplete
              ? { duration: 6, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
          aria-hidden="true"
        />
        <Image
          src="/images/law-book.png"
          alt=""
          width={1536}
          height={1024}
          className="relative h-auto w-full"
          style={{
            filter:
              "drop-shadow(0 30px 40px rgba(0,0,0,0.55)) drop-shadow(0 0 40px rgba(139,92,246,0.25))",
          }}
          priority
        />
      </div>

      {/* roadmap svg overlay */}
      <svg
        className="absolute inset-0 z-30 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`roadmap-gradient-${variant.id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>

        {/* dim base guide line */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(139,92,246,0.18)"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* measuring path (invisible, used for getTotalLength/getPointAtLength) */}
        <path ref={pathRef} d={pathD} fill="none" stroke="none" />

        {/* illuminated, progressively revealed path */}
        <motion.path
          d={pathD}
          fill="none"
          stroke={`url(#roadmap-gradient-${variant.id})`}
          strokeWidth="1.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{
            pathLength: progress,
            filter: "drop-shadow(0 0 3px #8B5CF6) drop-shadow(0 0 8px #22D3EE)",
          }}
        />
      </svg>

      {/* traveling orb — an HTML element (not SVG) positioned by percentage,
          so it stays a true circle at any viewport width instead of
          stretching into an ellipse under the roadmap svg's non-uniform
          preserveAspectRatio="none" scaling. */}
      <motion.div
        className="absolute z-[35] size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cc-teal/40 blur-md"
        style={{ left: orbLeft, top: orbTop, opacity: orbGlowOpacity }}
        aria-hidden="true"
      />
      <motion.div
        className="absolute z-[35] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        style={{
          left: orbLeft,
          top: orbTop,
          opacity: orbOpacity,
          filter: "drop-shadow(0 0 4px #F8FAFC) drop-shadow(0 0 8px #22D3EE)",
        }}
        aria-hidden="true"
      />

      {/* nodes */}
      {roadmapMarkers.map((marker, i) => (
        <RoadmapNode
          key={marker.label}
          marker={marker}
          point={variant.nodes[i]}
          isActive={Boolean(prefersReducedMotion) || activeFlags[i]}
          isFinal={i === roadmapMarkers.length - 1}
        />
      ))}
    </div>
  );
}
