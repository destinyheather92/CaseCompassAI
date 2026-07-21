"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav";
import type { DashboardNavContext } from "@/lib/dashboard/dashboard-nav-items";

export function DashboardShell({
  children,
  navContext,
  postLogoutRedirect,
}: {
  children: ReactNode;
  navContext: DashboardNavContext;
  postLogoutRedirect: string;
}) {
  return (
    <div className="min-h-screen bg-cc-bg">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-cc-bg/80 backdrop-blur-xl">
        <div className="relative flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <DashboardMobileNav navContext={navContext} postLogoutRedirect={postLogoutRedirect} />
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
            >
              <span className="relative flex size-8 items-center justify-center rounded-full border border-cc-purple/50 bg-gradient-to-br from-cc-purple/20 to-cc-teal/10">
                <Compass className="size-4 text-cc-purple" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="hidden text-base font-bold tracking-tight text-cc-text sm:inline">
                CASECOMPASS<span className="text-cc-purple">AI</span>
              </span>
            </Link>
          </div>
          <UserButton />
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl">
        <DashboardSidebar navContext={navContext} postLogoutRedirect={postLogoutRedirect} />
        <main className="min-w-0 flex-1 px-4 py-10 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
