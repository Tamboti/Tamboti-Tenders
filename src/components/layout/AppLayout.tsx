import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export const AppLayout = () => {
  const location = useLocation();
  return (
    <div className="relative h-screen overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 z-0 bg-app-warm-glow" aria-hidden />

      <div className="relative z-10 flex h-full min-h-0">
        <Sidebar />

        <div className="flex min-h-0 min-w-0 flex-1">
          <div className="flex flex-1 justify-center p-4">
            <div className="flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-background shadow-sm">
              <div className="md:hidden">
                <TopBar />
              </div>

              <main className="min-h-0 flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Outlet />
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
