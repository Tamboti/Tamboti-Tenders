import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { PortalBottomNav } from "./PortalBottomNav";

export const AppLayout = () => {
  const location = useLocation();
  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-background">
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
