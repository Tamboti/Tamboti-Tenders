import { useState } from "react";
import { Sparkles, LifeBuoy, User, FileText, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, FileSearch, Bell, Bookmark, LogOut, UserCircle2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

/* ── Nav data (mirrors Sidebar) ─────────────────────────────────── */
type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { heading?: string; items: NavItem[] };

const sections: NavSection[] = [
  { heading: "Scrappers", items: [{ to: "/sources", label: "Sources", icon: Globe }] },
  {
    heading: "Observe",
    items: [
      { to: "/", label: "Tenders", icon: FileSearch },
      { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    ],
  },
  { heading: "Engage", items: [{ to: "/alerts", label: "Alerts", icon: Bell }] },
];

/* ── Mobile drawer nav content ───────────────────────────────────── */
const MobileNav = ({ onNavigate }: { onNavigate: () => void }) => {
  const { user, role, signOut } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto px-1 py-2 space-y-5">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {section.heading && (
              <p className="px-2 pt-1 pb-1 text-xs font-medium text-muted-foreground">
                {section.heading}
              </p>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-normal transition-all",
                    isActive
                      ? "bg-background shadow-sm border border-gray-200 text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0 text-muted-foreground group-[.font-medium]:text-foreground" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="pt-4 pb-2 border-t border-border mt-2">
        <div className="rounded-lg border border-gray-200 bg-background/80 p-3 space-y-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserCircle2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{user?.email ?? "No account"}</p>
              <p className="text-[11px] text-muted-foreground">Role: {role ?? "—"}</p>
            </div>
          </div>
          <button
            onClick={() => { void signOut(); onNavigate(); }}
            className="w-full h-9 flex items-center justify-center gap-2 rounded-md border border-gray-200 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── TopBar ──────────────────────────────────────────────────────── */
export const TopBar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-border bg-[hsl(var(--header-background,var(--background)))] flex items-center justify-between px-4 sticky top-0 z-20">

        {/* Left — hamburger on mobile, logo on desktop */}
        <div className="flex justify-end items-end  w-full">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden h-8 w-8 flex p-2 items-center border rounded-full justify-center  hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

        </div>

        
      </header>

      {/* Mobile nav drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl px-5 pt-5 pb-6 h-auto max-h-[80vh] flex flex-col">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-base font-semibold">Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <MobileNav onNavigate={() => setDrawerOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};