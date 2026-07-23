import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Layers, LogOut } from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { AvatarInitial } from "@/components/AvatarInitial";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOGO_URL =
  "https://luykyredvhhcamcmgahp.supabase.co/storage/v1/object/public/Company%20assets/Gemini_Generated_Image_k92dq5k92dq5k92d-removebg-preview.png";

// Always visible, logged in or not.
const PUBLIC_LINKS = [
  { to: "/tenders", label: "Tenders" },
  { to: "/blog", label: "Blog" },
];

// Member accounts only — admins get the admin dashboard link instead (they
// can still reach their own bookmarks/alerts from its sidebar).
const MEMBER_LINKS = [
  { to: "/bookmarks", label: "Bookmarks" },
  { to: "/alerts", label: "Alerts" },
];

export const PublicNav = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Shared by the desktop nav row and the mobile hamburger panel, so
  // Dashboard/Bookmarks/Alerts are reachable everywhere on mobile too —
  // not just from the bottom nav, which doesn't show on every page.
  const navLinks = !user
    ? PUBLIC_LINKS
    : isAdmin
      ? [...PUBLIC_LINKS, { to: "/sources", label: "Dashboard" }]
      : [...PUBLIC_LINKS, ...MEMBER_LINKS];

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NavLink to="/" className="shrink-0">
          <img src={LOGO_URL} alt="Tender Compass" className="h-8 w-8 object-contain" />
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "h-9 px-3 rounded-lg text-lg inline-flex items-center transition-colors",
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg bg-card px-2 py-1.5 text-sm focus:outline-none"
                  aria-label="Account menu"
                >
                  <AvatarInitial
                    label={user.email}
                    seed={user.id}
                    className="ring-2 ring-border ring-offset-2 ring-offset-background"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[14rem]">
                <div className="px-3 py-2">
                  <span className="block text-xs text-muted-foreground">Signed in as</span>
                  <span className="block truncate font-medium text-foreground">{user.email}</span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(isAdmin ? "/sources" : "/bookmarks")} className="gap-2">
                  <Layers className="h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                Log in
              </Button>
              <Button size="sm" onClick={() => navigate("/login?mode=signup")}>
                Sign up
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-background px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "block rounded-lg px-3 py-2.5 text-sm",
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          {user ? (
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
                <AvatarInitial label={user.email} seed={user.id} />
                <span className="truncate text-foreground/90">{user.email}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setMobileOpen(false); void signOut(); }}
              >
                Sign out
              </Button>
            </div>
          ) : (
            <div className="pt-2 flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={() => { setMobileOpen(false); navigate("/login"); }}>
                Log in
              </Button>
              <Button size="sm" onClick={() => { setMobileOpen(false); navigate("/login?mode=signup"); }}>
                Sign up
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
