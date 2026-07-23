import { useState } from "react";
import { Menu, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { visibleNavSections } from "./nav.ts";
import { Sidebar } from "./Sidebar";
import { AvatarInitial } from "@/components/AvatarInitial";

// AppLayout (and this TopBar) renders admin routes plus the /admin/* mounts
// of Tenders/Bookmarks/Alerts — see App.tsx and nav.ts.
const getRouteLabel = (pathname: string) => {
  if (pathname.startsWith("/sources")) return "Sources";
  if (pathname.startsWith("/admin/posts")) return "Blog";
  if (pathname.startsWith("/admin/tenders")) return "Tenders";
  if (pathname.startsWith("/admin/bookmarks")) return "Bookmarks";
  if (pathname.startsWith("/admin/alerts")) return "Alerts";
  return "Admin";
};

/* ── TopBar ──────────────────────────────────────────────────────── */
export const TopBar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { role, isAdmin } = useUserRole();
  const location = useLocation();
  const title = getRouteLabel(location.pathname);
  const navSections = visibleNavSections(isAdmin);

  return (
    <>
      <header className="h-14 border-b border-border bg-[hsl(var(--header-background,var(--background)))] sticky top-0 z-20">
        <div className="h-full flex items-center justify-between px-4">
          {/* Left */}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{title}</div>
            <div className="hidden sm:block text-[11px] text-muted-foreground truncate">
              Tender Compass
            </div>
          </div>

          {/* Center — quick links (desktop) */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navSections.flatMap((s) => s.items).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "h-9 px-3 rounded-lg text-sm inline-flex items-center gap-2 transition-colors",
                    isActive
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-1.5">
                <AvatarInitial label={user?.email} seed={user?.id} className="shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground truncate max-w-[16rem]">
                    {user?.email ?? "No account"}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">Role: {role ?? "—"}</div>
                </div>
              </div>
              <button
                onClick={() => void signOut()}
                className="h-9 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors inline-flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>

            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden h-8 w-8 flex p-2 items-center border rounded-full justify-center hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer — reuses Sidebar's mobile mode (nav sections + account card) so there's one nav definition, not two. */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl px-5 pt-5 pb-6 h-[85vh] flex flex-col">
          <SheetHeader className="mb-2 text-left">
            <SheetTitle className="text-base font-semibold">Menu</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0">
            <Sidebar mobile onNavigate={() => setDrawerOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
