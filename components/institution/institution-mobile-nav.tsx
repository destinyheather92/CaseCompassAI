"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getInstitutionNavItems } from "@/lib/institution/institution-nav-items";
import { LogOutButton } from "@/components/dashboard/log-out-button";

function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function InstitutionMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navItems = getInstitutionNavItems();

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-2 text-cc-text outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
        aria-label={open ? "Close institution menu" : "Open institution menu"}
        aria-expanded={open}
        aria-controls="institution-mobile-menu"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="institution-mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute inset-x-0 top-16 overflow-hidden border-b border-white/[0.06] bg-cc-bg"
          >
            <nav aria-label="Institution" className="flex flex-col gap-1 px-6 py-4">
              {navItems.map((item) => {
                const isActive = isActiveHref(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-base transition-colors outline-none focus-visible:ring-2 focus-visible:ring-cc-purple ${
                      isActive
                        ? "border-cc-purple/50 bg-cc-purple/15 font-semibold text-cc-text"
                        : "border-transparent font-medium text-cc-muted hover:bg-white/[0.04] hover:text-cc-text"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-2">
                <LogOutButton postLogoutRedirect="/institution/login" className="w-full" />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
