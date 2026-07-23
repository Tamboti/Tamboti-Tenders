import type React from "react";
import { Globe, Pencil, Search, Bookmark, Bell, TrendingUp } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

export type NavSection = {
  heading?: string;
  items: NavItem[];
};

// This nav backs AppLayout, the admin dashboard shell. Tenders/Bookmarks/
// Alerts are hidden from the public top nav for admins (see PublicNav.tsx),
// so they're surfaced here instead, pointed at the /admin/* mounts of those
// same pages (App.tsx) so moving between them never leaves the dashboard shell.
export const NAV_SECTIONS: NavSection[] = [
  {
    heading: "Personal",
    items: [
      { to: "/admin/tenders", label: "Tenders", icon: Search },
      { to: "/admin/bookmarks", label: "Bookmarks", icon: Bookmark },
      { to: "/admin/alerts", label: "Alerts", icon: Bell },
    ],
  },
  { heading: "Scrapers", items: [{ to: "/sources", label: "Sources", icon: Globe, adminOnly: true }] },
  {
    heading: "Insights",
    items: [{ to: "/admin/analytics", label: "Analytics", icon: TrendingUp, adminOnly: true }],
  },
  { heading: "Content", items: [{ to: "/admin/posts", label: "Blog", icon: Pencil, adminOnly: true }] },
];

// Cosmetic only — RLS is what actually enforces admin-only access.
export const visibleNavSections = (isAdmin: boolean): NavSection[] =>
  NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || isAdmin),
  })).filter((section) => section.items.length > 0);

