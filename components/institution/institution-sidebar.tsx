"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getInstitutionNavItems } from "@/lib/institution/institution-nav-items";
import { LogOutButton } from "@/components/dashboard/log-out-button";

function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function InstitutionSidebar({ institutionName }: { institutionName: string }) {
  const pathname = usePathname();
  const navItems = getInstitutionNavItems();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] px-4 py-8 lg:flex">
      <div className="mb-4 px-3">
        <p className="text-xs font-semibold tracking-wide text-cc-muted uppercase">Institution</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-cc-text">{institutionName}</p>
      </div>
      <nav aria-label="Institution" className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive = isActiveHref(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-cc-purple ${
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
      </nav>
      <div className="mt-auto border-t border-white/[0.06] pt-4">
        <LogOutButton postLogoutRedirect="/institution/login" className="w-full" />
      </div>
    </aside>
  );
}
