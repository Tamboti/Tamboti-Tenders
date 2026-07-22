import { Outlet } from "react-router-dom";
import { PublicNav } from "./PublicNav";
import { PublicFooter } from "./PublicFooter";

// Unlike AppLayout (a fixed-height h-screen card shell for the authenticated
// dashboard), this is a normal top-to-bottom scrolling page — the right
// shape for a marketing site, and what Tenders.tsx's scroll-button logic
// already falls back to when there's no .overflow-y-auto ancestor.
export const PublicLayout = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <PublicNav />
    <main className="flex-1">
      <Outlet />
    </main>
    <PublicFooter />
  </div>
);
