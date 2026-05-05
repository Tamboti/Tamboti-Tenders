import type React from "react";
import { Globe, FileSearch, Bell, Bookmark } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type NavSection = {
  heading?: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  { heading: "Scrapers", items: [{ to: "/sources", label: "Sources", icon: Globe }] },
  {
    heading: "Observe",
    items: [
      { to: "/", label: "Tenders", icon: FileSearch },
      { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    ],
  },
  { heading: "Engage", items: [{ to: "/alerts", label: "Alerts", icon: Bell }] },
];

