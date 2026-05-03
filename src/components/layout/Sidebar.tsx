import { NavLink } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, FileSearch, Bell, PanelLeft, Search, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";


type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  heading?: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    heading: "Scrappers",
    items: [{ to: "/sources", label: "Sources", icon: Globe }],
  },
  {
    heading: "Observe",
    items: [{ to: "/", label: "Tenders", icon: FileSearch }, { to: "/bookmarks", label: "Bookmarks", icon: Bookmark }],
  },
  {
    heading: "Engage",
    items: [{ to: "/alerts", label: "Alerts", icon: Bell }],
  },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className=" bg-gray-50 flex flex-col h-screen sticky top-0 py-4 overflow-hidden"
    >
      <div className="px-3 pb-2">
       
          <img
            src="/bgg.png"
            alt="Tender Compass"
            className={cn(
              "object-contain transition-all duration-200",
              collapsed ? "h-6 " : "h-14 w-auto "
            )}
          />
      
      </div>

      

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {section.heading && !collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground"
              >
                {section.heading}
              </motion.div>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === "/"}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center  gap-2.5 px-2 py-1.5 rounded-md text-sm font-normal transition-all duration-200",
                    isActive
                      ? "bg-background   shadow-sm rounded-lg border  border-gray-200 text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )
                }
              >
                <item.icon className="h-4 w-4 ml-1 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="px-3 py-2 border-t border-sidebar-border">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-muted-foreground transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <PanelLeft className="h-4 w-4" />
          </motion.div>
        </button>
      </div>
    </motion.aside>
  );
};
