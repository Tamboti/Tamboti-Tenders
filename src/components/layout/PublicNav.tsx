import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { LOGO_URL, SITE_NAME } from "@/lib/brand";

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
    <>
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
          <img src={LOGO_URL} alt={SITE_NAME} className=" w-14 object-contain" />
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
              <Button size="sm" onClick={() => navigate(isAdmin ? "/admin/analytics" : "/portal/bookmarks")}>
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
    </header>

    <AnimatePresence>
      {mobileOpen && (
        <motion.div
          key="mobile-menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="md:hidden fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col overflow-y-auto border-t border-border/60 bg-background"
        >
          <nav className="flex-1 px-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center border-b border-border/60 py-5 text-2xl font-medium transition-colors",
                    isActive ? "text-primary" : "text-foreground/90"
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-border/60 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            {user ? (
              <Button
                size="lg"
                className="w-full"
                onClick={() => { setMobileOpen(false); navigate(isAdmin ? "/admin/analytics" : "/portal/bookmarks"); }}
              >
                {isAdmin ? "Dashboard" : "Portal"}
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <Button variant="outline" size="lg" className="w-full" onClick={() => { setMobileOpen(false); navigate("/login"); }}>
                  Log in
                </Button>
                <Button size="lg" className="w-full" onClick={() => { setMobileOpen(false); navigate("/login?mode=signup"); }}>
                  Sign up
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};
