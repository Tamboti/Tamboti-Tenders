import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export const AppLayout = () => {
  const location = useLocation();
  return (
    <div className="h-screen flex bg-gray-50  overflow-hidden">
  <Sidebar />

  

  {/* RIGHT SIDE WRAPPER */}
  <div className="flex-1 flex min-h-0">
    
    {/* CENTERED FRAME */}
    <div className="flex-1 flex justify-center p-4">
      <div className="w-full max-w-6xl h-full bg-background shadow-sm rounded-2xl border  border-gray-200  overflow-hidden flex flex-col">
      <div className="md:hidden">
      <TopBar/>

        </div>  
     
        {/* SCROLL AREA */}
        <main className="flex-1 min-h-0 overflow-y-auto">
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
  );
};
