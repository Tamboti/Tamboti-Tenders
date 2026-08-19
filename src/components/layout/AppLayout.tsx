import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { PortalBottomNav } from "./PortalBottomNav";
import { ADMIN_PORTAL_CHUNK_LOADERS } from "@/lib/lazyRoutes";

export const AppLayout = () => {
  const location = useLocation();

  // Fires once per session on entering the dashboard shell (this layout
  // doesn't remount between tabs, only its <Outlet /> content changes) —
  // warms every other admin/portal chunk in the background so clicking a
  // tab you haven't visited yet doesn't have to wait on a fresh fetch.
  // Delayed slightly so it doesn't compete with the current tab's own data
  // requests right as it's loading.
  useEffect(() => {
    const timer = setTimeout(() => {
      ADMIN_PORTAL_CHUNK_LOADERS.forEach((load) => {
        load().catch(() => {
          // Best-effort cache warming — a failed prefetch just means the
          // real navigation later fetches it normally, nothing to handle.
        });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    // h-dvh, not h-screen — 100vh on mobile is sized against the browser's
    // largest possible viewport (toolbar collapsed), not what's actually
    // visible. With the toolbar showing (the normal state), that made this
    // div taller than the real screen, so the whole page scrolled instead of
    // just <main>, dragging TopBar/PortalBottomNav in and out of view along
    // with it. dvh tracks the actual visible viewport instead.
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      <Sidebar />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-border">
        <div className="md:hidden">
          <TopBar />
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <PortalBottomNav />
      </div>
    </div>
  );
};
