import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, FileSearch, Compass, Search, Bookmark, BookOpen, Settings } from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface DashboardNavContext {
  /** Most recently updated intake owned by the user, or null if none exists yet. */
  latestIntakeId: string | null;
  /** Most recently updated roadmap owned by the user, or null if none exists yet. */
  latestRoadmapId: string | null;
}

/**
 * My Intake/My Roadmap resolve to the most recent resource so a single
 * nav link always has somewhere sensible to go, falling back to the
 * flow that creates one (get-started) or the full history list
 * (research) rather than a dead link when nothing exists yet.
 */
export function getDashboardNavItems(context: DashboardNavContext): DashboardNavItem[] {
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      href: context.latestIntakeId ? `/dashboard/intakes/${context.latestIntakeId}` : "/get-started",
      label: "My Intake",
      icon: FileSearch,
    },
    {
      href: context.latestRoadmapId ? `/dashboard/roadmaps/${context.latestRoadmapId}` : "/dashboard/research",
      label: "My Roadmap",
      icon: Compass,
    },
    { href: "/dashboard/research", label: "Research", icon: Search },
    { href: "/dashboard/saved", label: "Saved", icon: Bookmark },
    { href: "/dashboard/resources", label: "Resources", icon: BookOpen },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];
}
