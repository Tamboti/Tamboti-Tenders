import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Search, Bookmark, Bell, LogOut, Globe } from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { AvatarInitial } from "@/components/AvatarInitial";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const MEMBER_ITEMS = [
  { to: "/tenders", label: "Tenders", icon: Search },
  { to: "/bookmarks", label: "Saved", icon: Bookmark },
  { to: "/alerts", label: "Alerts", icon: Bell },
];

// Admins don't get the member-only Saved/Alerts tabs here — they reach their
// own bookmarks/alerts from the admin dashboard sidebar instead (nav.ts).
const ADMIN_ITEMS = [{ to: "/tenders", label: "Tenders", icon: Search }];

// Surfaces Bookmarks/Alerts as a persistent tab bar for logged-in mobile
// users — the avatar button buried in PublicNav wasn't discoverable enough.
// Logged-out visitors keep the hamburger-only experience.
export const PublicBottomNav = () => {
  const { user, signOut } = useAuth();
  const { role, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);

  // The landing page is a marketing/browse page, not an app screen — a
  // persistent tab bar there feels out of place, and the hamburger already
  // covers Dashboard/Bookmarks/Alerts for logged-in users on every page.
  if (!user || location.pathname === "/") return null;
  const items = isAdmin ? ADMIN_ITEMS : MEMBER_ITEMS;

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden">
        <div className="flex items-stretch">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition-colors",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] text-muted-foreground"
          >
            <AvatarInitial label={user.email} seed={user.id} className="h-5 w-5 text-[9px]" />
            Account
          </button>
        </div>
        <div className="pb-[env(safe-area-inset-bottom)]" />
      </nav>

      <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pt-5 pb-6">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-base font-semibold">Account</SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <AvatarInitial label={user.email} seed={user.id} className="shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground">Role: {role ?? "—"}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {isAdmin && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  setAccountOpen(false);
                  navigate("/sources");
                }}
              >
                <Globe className="h-4 w-4" />
                Admin dashboard
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setAccountOpen(false);
                void signOut();
                navigate("/");
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
