import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";

export type PlatformNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type PlatformNavSection = {
  title?: string;
  items: PlatformNavItem[];
};

/** Desktop sidebar + mobile sheet for the SUPER_ADMIN console. */
export const platformNavSections: PlatformNavSection[] = [
  {
    items: [
      { href: "/platform", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Tenants",
    items: [
      { href: "/platform/organizations", label: "Organizations", icon: Building2 },
      { href: "/platform/users", label: "Users", icon: Users },
      { href: "/platform/devices", label: "Devices", icon: Smartphone },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/platform/analytics", label: "Analytics", icon: TrendingUp },
      { href: "/platform/telemetry", label: "Telemetry", icon: Activity },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/platform/audit", label: "Audit log", icon: FileText },
      { href: "/platform/notifications", label: "Notifications", icon: Bell },
    ],
  },
];

/** Bottom bar (mobile): five most-used surfaces. */
export const platformMobileBottomNav: PlatformNavItem[] = [
  { href: "/platform", label: "Home", icon: LayoutDashboard },
  { href: "/platform/organizations", label: "Orgs", icon: Building2 },
  { href: "/platform/devices", label: "Devices", icon: Smartphone },
  { href: "/platform/telemetry", label: "Telemetry", icon: Activity },
  { href: "/platform/audit", label: "More", icon: MoreHorizontal },
];
