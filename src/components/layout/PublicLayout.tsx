import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { PublicNav } from "./PublicNav";
import { PublicFooter } from "./PublicFooter";
import { PublicBottomNav } from "./PublicBottomNav";

// Unlike AppLayout (a fixed-height h-screen card shell for the authenticated
// dashboard), this is a normal top-to-bottom scrolling page — the right
// shape for a marketing site, and what Tenders.tsx's scroll-button logic
// already falls back to when there's no .overflow-y-auto ancestor.
export const PublicLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  // PublicBottomNav doesn't render on "/" — no need to reserve space for it there.
  const showsBottomNav = !!user && location.pathname !== "/";
  return (
    <div className={cn("flex min-h-screen flex-col bg-background", showsBottomNav && "pb-16 md:pb-0")}>
      <PublicNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      <PublicBottomNav />
    </div>
  );
};
