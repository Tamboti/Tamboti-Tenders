import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { LOGO_URL } from "@/lib/brand";

// Always visible, logged in or not.
const PUBLIC_LINKS = [
  { to: "/tenders", label: "Tenders" },
  { to: "/pricing", label: "Pricing" },
  { to: "/blog", label: "Blog" },
];

export const PublicNav = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Public pages stay Tenders/Pricing/Blog for everyone — signed-in users
  // reach Dashboard/Portal (Bookmarks/Alerts included) via the account
  // button instead, not extra top-nav links.
  const navLinks = PUBLIC_LINKS;

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
      {/* Mobile: plain 2-item flex row (logo, hamburger) so the logo gets its
          natural width. Desktop (md+): 1fr/auto/1fr grid — unlike
          justify-between, this centers the middle column exactly regardless
          of how wide the logo vs. actions are. Only switching to the grid at
          md+ matters here — below that, the nav column is hidden/empty, so a
          grid would still force the two 1fr side columns to equal widths and
          squeeze the logo down to match the tiny hamburger column. */}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8 md:grid md:grid-cols-[1fr_auto_1fr]">
        <NavLink to="/" className="flex items-center shrink-0 md:justify-self-start">
          <img src={LOGO_URL} alt="Tender Compass" className=" w-14 object-contain" />
          <span className="whitespace-nowrap text-2xl font-semibold tracking-tighter text-primary">Tamboti Tenders</span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1 md:justify-self-center">
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

        <div className="flex items-center gap-2 md:justify-self-end">
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Button size="sm" onClick={() => navigate(isAdmin ? "/admin/sources" : "/portal/bookmarks")}>
                {isAdmin ? "Dashboard" : "Portal"}
              </Button>
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
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => { setMobileOpen(false); navigate(isAdmin ? "/admin/sources" : "/portal/bookmarks"); }}
              >
                {isAdmin ? "Dashboard" : "Portal"}
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
