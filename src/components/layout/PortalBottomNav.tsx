import { useState } from "react";
import { NavLink } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { visibleNavSections, type NavItem } from "./nav.ts";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// Mobile-only quick-access tabs for the portal/admin shell — the one place a
// persistent bottom nav belongs (see PublicBottomNav, which deliberately
// stays minimal on public pages instead). Reuses nav.ts's section
// definitions so there's one nav source, not two.
//
// Members only have a "Personal" section, so it's the whole tab bar. Admins
// mostly live in Sources/Analytics/Blog day to day — those become the
// primary tabs, and Personal (their own Tenders/Bookmarks/Alerts) moves
// behind a "More" sheet instead of eating tab space for pages they rarely
// open from a phone.
export const PortalBottomNav = () => {
  const { isAdmin } = useUserRole();
  const [moreOpen, setMoreOpen] = useState(false);
  const sections = visibleNavSections(isAdmin);

  const personal = sections.find((s) => s.heading === "Personal")?.items ?? [];
  const primaryItems: NavItem[] = isAdmin
    ? sections.filter((s) => s.heading !== "Personal").flatMap((s) => s.items)
    : personal;
  const moreItems: NavItem[] = isAdmin ? personal : [];

  if (primaryItems.length === 0 && moreItems.length === 0) return null;

  return (
    <>
      <nav className="shrink-0 border-t border-border bg-background md:hidden">
        <div className="flex items-stretch">
          {primaryItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition-colors",
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}

          {moreItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] text-muted-foreground transition-colors"
            >
              <MoreHorizontal className="h-5 w-5" />
              More
            </button>
          )}
        </div>
        <div className="pb-[env(safe-area-inset-bottom)]" />
      </nav>

      {moreItems.length > 0 && (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="md:hidden rounded-t-2xl px-5 pt-5 pb-6">
            <SheetHeader className="mb-2 text-left">
              <SheetTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Personal
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-1">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};
