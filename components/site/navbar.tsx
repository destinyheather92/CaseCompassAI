"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { navLinks } from "@/lib/site-data";

function idFromHref(href: string) {
  return href.replace(/^\/?#/, "");
}

const sectionIds = navLinks.map((link) => idFromHref(link.href));
const scrollTargetIds = new Set(["top", ...sectionIds]);

// How long a manual nav click "pins" the clicked section as active before
// scroll-driven detection is allowed to take back over. This covers the
// smooth-scroll transit time so the indicator doesn't flicker through
// whatever sections happen to pass by mid-scroll.
const CLICK_OVERRIDE_MS = 900;

function useActiveSection(ids: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const overrideUntilRef = useRef(0);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < overrideUntilRef.current) return;
        setActiveId((prev) => {
          const visible = entries.filter((entry) => entry.isIntersecting);
          if (visible.length === 0) return prev;
          const topMost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
          );
          return topMost.target.id;
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  const setActiveNow = (id: string) => {
    overrideUntilRef.current = Date.now() + CLICK_OVERRIDE_MS;
    setActiveId(id);
  };

  return { activeId, setActiveNow };
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { activeId, setActiveNow } = useActiveSection(sectionIds);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";

  // Custom smooth-scroll instead of relying on the browser's native
  // anchor-jump: it lets the active-state update land in the same tick as
  // the scroll starts, and sidesteps a rendering glitch where a fixed header
  // can briefly fail to repaint during a native smooth-scroll-to-anchor.
  const scrollToId = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 80;
    const offset = id === "top" ? 0 : headerHeight + 24;
    const top = Math.max(target.getBoundingClientRect().top + window.scrollY - offset, 0);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
  };

  // On the home page, intercept clicks and scroll in place. On any other
  // page there's nothing to scroll to yet, so let the link do a normal
  // navigation to "/#section" — the effect below picks up the hash once
  // the home page has mounted and finishes the scroll from there.
  const handleNavClick = (event: React.MouseEvent, href: string) => {
    if (!isHome) return;
    const id = idFromHref(href);
    if (!scrollTargetIds.has(id)) return;
    event.preventDefault();
    if (id !== "top") setActiveNow(id);
    scrollToId(id);
  };

  useEffect(() => {
    if (!isHome) return;
    const hash = window.location.hash.replace("#", "");
    if (!hash || !scrollTargetIds.has(hash)) return;
    const timer = setTimeout(() => {
      if (hash !== "top") setActiveNow(hash);
      scrollToId(hash);
    }, 60);
    return () => clearTimeout(timer);
    // Only re-run when arriving at "/" — not on every activeId change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHome]);

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-50">
      <nav
        aria-label="Primary"
        className="border-b border-white/[0.06] bg-cc-bg/70 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link
            href="/#top"
            onClick={(e) => handleNavClick(e, "/#top")}
            className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
          >
            <span className="relative flex size-9 items-center justify-center rounded-full border border-cc-purple/50 bg-gradient-to-br from-cc-purple/20 to-cc-teal/10">
              <Compass className="size-5 text-cc-purple" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight text-cc-text">
              CASECOMPASS<span className="text-cc-purple">AI</span>
            </span>
          </Link>

          <ul className="hidden items-center gap-1.5 lg:flex">
            {navLinks.map((link) => {
              const id = idFromHref(link.href);
              const isActive = activeId === id;
              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    aria-current={isActive ? "true" : undefined}
                    className={`relative z-10 block rounded-full px-4 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-cc-purple ${
                      isActive
                        ? "font-semibold text-cc-text"
                        : "font-medium text-cc-muted hover:text-cc-text focus-visible:text-cc-text"
                    }`}
                  >
                    {link.label}
                  </Link>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-full border border-cc-purple/50 bg-cc-purple/15 shadow-[0_0_16px_rgba(139,92,246,0.35)]"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="hidden lg:block">
            <Link
              href="/#get-started"
              className="group inline-flex items-center justify-center rounded-full border border-cc-purple/60 px-5 py-2.5 text-sm font-semibold text-cc-text transition-all duration-300 hover:border-cc-purple hover:shadow-[0_0_24px_rgba(139,92,246,0.45)] outline-none focus-visible:ring-2 focus-visible:ring-cc-purple focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-cc-text lg:hidden outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              id="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden border-t border-white/[0.06] lg:hidden"
            >
              <ul className="flex flex-col gap-1 px-6 py-4">
                {navLinks.map((link) => {
                  const id = idFromHref(link.href);
                  const isActive = activeId === id;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={(e) => {
                          handleNavClick(e, link.href);
                          setOpen(false);
                        }}
                        aria-current={isActive ? "true" : undefined}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-base transition-colors outline-none focus-visible:ring-2 focus-visible:ring-cc-purple ${
                          isActive
                            ? "border-cc-purple/50 bg-cc-purple/15 font-semibold text-cc-text"
                            : "border-transparent font-medium text-cc-muted hover:bg-white/[0.04] hover:text-cc-text"
                        }`}
                      >
                        <span
                          className={`size-1.5 shrink-0 rounded-full bg-gradient-to-r from-cc-purple to-cc-teal transition-opacity ${
                            isActive ? "opacity-100" : "opacity-0"
                          }`}
                          aria-hidden="true"
                        />
                        {link.label}
                        {isActive && (
                          <span className="ml-auto text-[0.65rem] font-semibold tracking-wide text-cc-purple uppercase">
                            Viewing
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
                <li className="pt-2">
                  <Link
                    href="/#get-started"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center rounded-full border border-cc-purple/60 px-5 py-3 text-base font-semibold text-cc-text hover:border-cc-purple outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
                  >
                    Get Started
                  </Link>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
