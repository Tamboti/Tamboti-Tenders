import { useState } from "react";
import { LogOut, Home } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { AvatarInitial } from "@/components/AvatarInitial";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LOGO_URL } from "@/lib/brand";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", member: "Member" };

// AppLayout (and this TopBar) renders admin routes plus the /portal/* mounts
// of Tenders/Bookmarks/Alerts — see App.tsx and nav.ts.
const getRouteLabel = (pathname: string) => {
  if (pathname.startsWith("/admin/sources")) return "Sources";
  if (pathname.startsWith("/admin/posts")) return "Blog";
  if (pathname.startsWith("/admin/analytics")) return "Analytics";
  if (pathname.startsWith("/portal/tenders")) return "Tenders";
  if (pathname.startsWith("/portal/bookmarks")) return "Bookmarks";
  if (pathname.startsWith("/portal/alerts")) return "Alerts";
  if (pathname.startsWith("/portal/billing")) return "Billing";
  return "Dashboard";
};

/* ── TopBar ──────────────────────────────────────────────────────── */
export const TopBar = () => {
  const [panelOpen, setPanelOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const location = useLocation();
  const navigate = useNavigate();
  const title = getRouteLabel(location.pathname);
  // All nav (Personal, and for admins Sources/Analytics/Blog) already lives
  // in PortalBottomNav — this panel is just account actions, not a second
  // copy of that tab bar.

  return (
    <>
      <header className="h-14 border-b border-border bg-[hsl(var(--header-background,var(--background)))] sticky top-0 z-20">
        <div className="h-full flex items-center justify-between px-4">
          {/* Logo was getting lost entirely below the sm breakpoint (most
              phones), leaving no brand identity on mobile at all. */}
          <div className="flex min-w-0 items-center gap-2">
            <img src={LOGO_URL} alt="" className="h-7 w-7 shrink-0 object-contain" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{title}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                Tamboti Tenders
              </div>
            </div>
          </div>

          {/* Personal nav lives in PortalBottomNav now, so this is just the
              account entry point — not a hamburger into a full nav drawer. */}
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="shrink-0"
            aria-label="Account menu"
          >
            <AvatarInitial
              label={user?.email}
              seed={user?.id}
              className="h-8 w-8 ring-2 ring-border ring-offset-2 ring-offset-background"
            />
          </button>
        </div>
      </header>

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent side="bottom" className="md:hidden rounded-t-2xl px-5 pt-5 pb-6">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="sr-only">Account</SheetTitle>
            <div className="flex items-center gap-3">
              <AvatarInitial label={user?.email} seed={user?.id} className="h-10 w-10 text-sm shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{user?.email ?? "No account"}</p>
                {role && <p className="text-xs text-muted-foreground">{ROLE_LABEL[role] ?? role}</p>}
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-1">
            <div className="flex items-center justify-between rounded-lg px-3 py-2.5">
              <span className="text-sm font-medium text-foreground">Appearance</span>
              <ThemeToggle />
            </div>

            <button
              type="button"
              onClick={() => {
                setPanelOpen(false);
                navigate("/");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Home className="h-4 w-4" />
              Go to main site
            </button>

            <button
              type="button"
              onClick={() => {
                setPanelOpen(false);
                void signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
