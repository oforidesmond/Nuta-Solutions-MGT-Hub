import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  AlertTriangle,
  CalendarClock,
  Hourglass,
  PackagePlus,
  Boxes,
  ClipboardList,
  ClipboardPlus,
  Users,
  GitBranch,
  LineChart,
  Settings,
  Receipt,
  CloudUpload,
  HardDrive,
  Database,
  Bug,
  Undo2,
  Shield,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

/** Desktop sidebar + mobile sheet — order matches management hub design. */
export const navSections: NavSection[] = [
  {
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Products",
    items: [
      { href: "/products", label: "All products", icon: Package },
      { href: "/categories", label: "Categories", icon: FolderTree },
      { href: "/inventory/alerts", label: "Low stock", icon: AlertTriangle },
      { href: "/products/expiring", label: "Expiring soon", icon: Hourglass },
    ],
  },
  {
    title: "Inventory",
    items: [
      { href: "/inventory", label: "Overview", icon: Boxes },
      { href: "/batches", label: "Batches & expiry", icon: CalendarClock },
      { href: "/inventory/adjustments", label: "Stock adjustments", icon: ClipboardList },
      { href: "/inventory/stock-take", label: "Stock take", icon: ClipboardPlus },
      { href: "/inventory/temporary-items", label: "Temporary items", icon: PackagePlus },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/sales", label: "Sales", icon: Receipt },
      { href: "/returns", label: "Returns", icon: Undo2 },
      { href: "/staff", label: "Staff", icon: Users },
      { href: "/branches", label: "Branches", icon: GitBranch },
      { href: "/reports", label: "Reports", icon: LineChart },
      { href: "/audit", label: "Activity log", icon: Shield },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/operations/device-backups", label: "Device backups", icon: CloudUpload },
      { href: "/operations/device-storage-warnings", label: "Storage warnings", icon: HardDrive },
      { href: "/operations/database-warnings", label: "Database warnings", icon: Database },
      { href: "/operations/mobile-crashes", label: "Mobile crashes", icon: Bug },
    ],
  },
];

/** Bottom bar (mobile): short paths to most-used areas. */
export const mobileBottomNav: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/inventory", label: "Stock", icon: Boxes },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/settings", label: "More", icon: Settings },
];
