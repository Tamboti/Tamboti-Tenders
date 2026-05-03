import { NavLink } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, FileSearch, Bell, PanelLeft, Bookmark, LogOut, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

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
  { heading: "Scrappers", items: [{ to: "/sources", label: "Sources", icon: Globe }] },
  {
    heading: "Observe",
    items: [
      { to: "/", label: "Tenders", icon: FileSearch },
      { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    ],
  },
  { heading: "Engage", items: [{ to: "/alerts", label: "Alerts", icon: Bell }] },
];

type SidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export const Sidebar = ({ mobile = false, onNavigate }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, role, signOut } = useAuth();
  const compact = mobile ? false : collapsed;

  const content = (
    <>
      <div className={cn("px-3", mobile ? "pb-3" : "pb-2")} />
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {section.heading && !compact && (
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
                onClick={onNavigate}
                title={compact ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-normal transition-all duration-200",
                    isActive
                      ? "bg-background shadow-sm rounded-lg border border-gray-200 text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )
                }
              >
                <item.icon className="h-4 w-4 ml-1 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                <AnimatePresence initial={false}>
                  {!compact && (
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

      <div className="px-2 py-2 border-t border-sidebar-border space-y-2">
        <div className={cn("rounded-md border border-gray-200 bg-background/80", compact ? "p-1.5" : "p-2.5")}>
          {compact ? (
            <div className="flex justify-center">
              <UserCircle2 className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{user?.email ?? "No account"}</p>
                <p className="text-[11px] text-muted-foreground">Role: {role ?? "—"}</p>
              </div>
              <button
                onClick={() => {
                  void signOut();
                  onNavigate?.();
                }}
                className="w-full h-7 flex items-center justify-center gap-1.5 rounded-md border border-gray-200 text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>

        {!mobile && (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-muted-foreground transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <PanelLeft className="h-4 w-4" />
            </motion.div>
          </button>
        )}
      </div>
    </>
  );

  if (mobile) {
    return <aside className="bg-gray-50 flex flex-col h-full overflow-hidden">{content}</aside>;
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="bg-gray-50 hidden md:flex flex-col h-screen sticky top-0 py-4 overflow-hidden"
    >
      {content}
    </motion.aside>
  );
};
