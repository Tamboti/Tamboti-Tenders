import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { Button } from "@/components/ui/button";

// A persistent bottom bar only makes sense inside the portal/admin dashboard
// shell (AppLayout has its own Sidebar/TopBar nav for that) — on the public
// marketing/browse pages it's deliberately minimal: one link back into that
// shell for signed-in users, or a low-key sign-up nudge for anonymous
// visitors, who shouldn't feel pressured while they're just browsing tenders.
export const PublicBottomNav = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  // The landing page already has its own strong CTAs — a persistent bar
  // there would be redundant.
  if (location.pathname === "/") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden">
      <div className="px-4 py-2.5">
        {user ? (
          <Button
            size="sm"
            className="w-full"
            onClick={() => navigate(isAdmin ? "/admin/analytics" : "/portal/bookmarks")}
          >
            {isAdmin ? "Go to dashboard" : "Go to portal"}
          </Button>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11.5px] text-muted-foreground">
              Sign up free to bookmark &amp; get alerts
            </span>
            <div className="flex shrink-0 gap-2">
              <Button variant="ghost" size="sm" className="h-8 px-3" onClick={() => navigate("/login")}>
                Log in
              </Button>
              <Button size="sm" className="h-8 px-3" onClick={() => navigate("/login?mode=signup")}>
                Sign up
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </div>
  );
};
