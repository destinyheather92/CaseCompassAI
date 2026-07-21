import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users, BarChart3, Compass, Settings, BookOpen } from "lucide-react";

export interface InstitutionNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function getInstitutionNavItems(): InstitutionNavItem[] {
  return [
    { href: "/institution/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/institution/users", label: "User Management", icon: Users },
    { href: "/institution/reports", label: "Reports", icon: BarChart3 },
    { href: "/institution/roadmaps", label: "Roadmaps", icon: Compass },
    { href: "/resources/legal-research-basics", label: "Resources", icon: BookOpen },
    { href: "/institution/settings", label: "Institution Settings", icon: Settings },
  ];
}
