import type React from "react";
import { Globe, Pencil, Search, Bookmark, Bell, TrendingUp, CreditCard, Users } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  // Opposite of adminOnly — for things that only make sense for a member's
  // own account (e.g. subscription billing). Admins don't pay for Pro, so
  // showing them a personal billing page is just noise.
  hiddenForAdmin?: boolean;
};

export type NavSection = {
  heading?: string;
  items: NavItem[];
};

// This nav backs AppLayout, the shared portal/admin dashboard shell.
// Tenders/Bookmarks/Alerts aren't in the public top nav at all (see
// PublicNav.tsx) — every signed-in user reaches them here, at the
// /portal/* mounts of those same pages (App.tsx). Admin-only tooling lives
// under /admin/* (consistent with /portal/* — no bare, unprefixed routes).
export const NAV_SECTIONS: NavSection[] = [
  {
    heading: "Personal",
    items: [
      { to: "/portal/tenders", label: "Tenders", icon: Search },
      { to: "/portal/bookmarks", label: "Bookmarks", icon: Bookmark },
      { to: "/portal/alerts", label: "Alerts", icon: Bell },
      { to: "/portal/billing", label: "Billing", icon: CreditCard, hiddenForAdmin: true },
    ],
  },
  {
    heading: "Insights",
    items: [
      { to: "/admin/analytics", label: "Analytics", icon: TrendingUp, adminOnly: true },
      { to: "/admin/users", label: "Users", icon: Users, adminOnly: true },
    ],
  },
  { heading: "Scrapers", items: [{ to: "/admin/sources", label: "Sources", icon: Globe, adminOnly: true }] },
  { heading: "Content", items: [{ to: "/admin/posts", label: "Blog", icon: Pencil, adminOnly: true }] },
];

// Cosmetic only — RLS is what actually enforces admin-only access.
export const visibleNavSections = (isAdmin: boolean): NavSection[] => {
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => (!item.adminOnly || isAdmin) && !(item.hiddenForAdmin && isAdmin)
    ),
  })).filter((section) => section.items.length > 0);

  if (!isAdmin) return sections;

  // Admins live in Sources/Analytics/Blog day to day — surface those first
  // and push Personal (their own Tenders/Bookmarks/Alerts) to the bottom,
  // since it isn't the main focus of the admin dashboard.
  const personal = sections.filter((s) => s.heading === "Personal");
  const rest = sections.filter((s) => s.heading !== "Personal");
  return [...rest, ...personal];
};

