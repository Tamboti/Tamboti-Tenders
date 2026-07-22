import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import { AvatarInitial } from "@/components/AvatarInitial";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LOGO_URL =
  "https://luykyredvhhcamcmgahp.supabase.co/storage/v1/object/public/Company%20assets/Gemini_Generated_Image_k92dq5k92dq5k92d-removebg-preview.png";

const NAV_LINKS = [
  { to: "/tenders", label: "Tenders" },
  { to: "/blog", label: "Blog" },
];

export const PublicNav = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NavLink to="/" className="shrink-0">
          <img src={LOGO_URL} alt="Tender Compass" className="h-8 w-8 object-contain" />
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "h-9 px-3 rounded-lg text-lg inline-flex items-center transition-colors",
                  isActive
                    ? "bg-muted text-foreground font-medium"
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
            <>
              <button
                type="button"
                onClick={() => navigate("/bookmarks")}
                className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-2 py-1.5 text-sm hover:bg-muted/60 transition-colors"
              >
                <AvatarInitial label={user.email} seed={user.id} />
                <span className="max-w-[10rem] truncate text-foreground/90">{user.email}</span>
              </button>
              <Button variant="outline" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </>
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
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "block rounded-lg px-3 py-2.5 text-sm",
                  isActive ? "bg-muted text-foreground font-medium" : "text-muted-foreground"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); navigate("/bookmarks"); }}
                  className="flex items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm"
                >
                  <AvatarInitial label={user.email} seed={user.id} />
                  <span className="truncate text-foreground/90">{user.email}</span>
                </button>
                <Button variant="outline" size="sm" onClick={() => void signOut()}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => { setMobileOpen(false); navigate("/login"); }}>
                  Log in
                </Button>
                <Button size="sm" onClick={() => { setMobileOpen(false); navigate("/login?mode=signup"); }}>
                  Sign up
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
