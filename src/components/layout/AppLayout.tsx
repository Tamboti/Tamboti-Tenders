import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { PortalBottomNav } from "./PortalBottomNav";

export const AppLayout = () => {
  const location = useLocation();
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
