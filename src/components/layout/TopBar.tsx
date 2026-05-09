import { useState } from "react";
import { Menu, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_SECTIONS } from "./nav.ts";
import { AvatarInitial } from "@/components/AvatarInitial";
import { Switch } from "../ui/switch.tsx";
import { Label } from "../ui/label.tsx";

const SunIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const ThemeToggle = ({ isCompact, isDark, setTheme }: { isCompact?: boolean, isDark: boolean, setTheme: (theme: string) => void }) =>
  isCompact ? (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
      title={isDark ? "Switch to light" : "Switch to dark"}
    >
      {isDark
        ? <SunIcon className="h-4 w-4" />
        : <MoonIcon className="h-4 w-4" />
      }
    </button>
  ) : (
    <div className="flex items-center justify-between px-0.5">
      <div className="flex items-center gap-1.5">
        {isDark
          ? <MoonIcon className="h-3.5 w-3.5 text-muted-foreground" />
          : <SunIcon className="h-3.5 w-3.5 text-muted-foreground" />
        }
        <Label
          htmlFor="theme-switch"
          className="text-xs text-muted-foreground cursor-pointer select-none"
        >
          {isDark ? "Dark mode" : "Light mode"}
        </Label>
      </div>
      <Switch
        id="theme-switch"
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        className="scale-90"
      />
    </div>
  );

/* ── Mobile drawer nav content ───────────────────────────────────── */
const MobileNav = ({ onNavigate }: { onNavigate: () => void }) => {
  const { user, role, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto px-1 py-2 space-y-5">
        {NAV_SECTIONS.map((section, idx) => (
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
                      ? "bg-background shadow-sm border border-border text-foreground font-medium"
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
        <div className="rounded-lg border border-border bg-background/80 p-3 space-y-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AvatarInitial label={user?.email} seed={user?.id} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{user?.email ?? "No account"}</p>
              <p className="text-[11px] text-muted-foreground">Role: {role ?? "—"}</p>
            </div>
          </div>
          <ThemeToggle isDark={isDark} setTheme={setTheme} />
          <button
            onClick={() => { void signOut(); onNavigate(); }}
            className="w-full h-9 flex items-center justify-center gap-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

const getRouteLabel = (pathname: string) => {
  if (pathname === "/") return "Tenders";
  if (pathname.startsWith("/tender/")) return "Tender";
  if (pathname.startsWith("/bookmarks")) return "Bookmarks";
  if (pathname.startsWith("/sources")) return "Sources";
  if (pathname.startsWith("/alerts")) return "Alerts";
  if (pathname.startsWith("/login")) return "Login";
  return "Dashboard";
};

/* ── TopBar ──────────────────────────────────────────────────────── */
export const TopBar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const title = getRouteLabel(location.pathname);

  return (
    <>
      <header className="h-14 border-b border-border bg-[hsl(var(--header-background,var(--background)))] sticky top-0 z-20">
        <div className="h-full flex items-center justify-between px-4">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden h-8 w-8 flex p-2 items-center border rounded-full justify-center hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{title}</div>
              <div className="hidden sm:block text-[11px] text-muted-foreground truncate">
                Tender Compass
              </div>
            </div>
          </div>

          {/* Center — quick links (desktop) */}
          <nav className="hidden md:flex items-center gap-1.5">
            {NAV_SECTIONS.flatMap((s) => s.items).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "h-9 px-3 rounded-lg text-sm inline-flex items-center gap-2 transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
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