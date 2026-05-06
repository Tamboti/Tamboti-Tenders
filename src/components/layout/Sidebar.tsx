import { NavLink } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeft, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_SECTIONS } from "./nav.ts";
import { AvatarInitial } from "@/components/AvatarInitial";

type SidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export const Sidebar = ({ mobile = false, onNavigate }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, role, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const compact = mobile ? false : collapsed;

  const content = (
    <>
      {/* Top spacing */}
      <div className={cn("px-3", mobile ? "pb-3" : "pb-2")} />

      {/* NAV */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {/* LOGO */}
        <div
          className={cn(
            "mb-4 flex items-center",
            compact ? "justify-center" : "gap-2 px-2"
          )}
        >
          <img
            src="https://luykyredvhhcamcmgahp.supabase.co/storage/v1/object/public/Company%20assets/Gemini_Generated_Image_k92dq5k92dq5k92d-removebg-preview.png"
            alt="Tender Compass"
            className="h-7 w-7 object-contain shrink-0"
          />

          {!compact && (
            <h1 className="text-sm font-semibold tracking-tight truncate text-foreground">
              Tender Aggregator
            </h1>
          )}
        </div>

        {/* SECTIONS */}
        {NAV_SECTIONS.map((section, idx) => (
          <div
            key={idx}
            className={cn("space-y-1", compact && "space-y-2")}
          >
            {section.heading && !compact && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-3 pt-2 pb-1 text-[11px] font-medium text-muted-foreground"
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
                    "group flex rounded-md transition-all duration-200",
                    compact
                      ? "justify-center items-center h-10 w-10 mx-auto"
                      : "items-center gap-2.5 px-3 py-2 text-sm",
                    isActive
                      ? "bg-background shadow-sm border border-border text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />

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

      {/* BOTTOM PANEL */}
      <div className="px-2 py-2 border-t border-sidebar-border space-y-2">
        <div
          className={cn(
            "rounded-md border border-border bg-background/80",
            compact ? "p-2" : "p-3"
          )}
        >
          {compact ? (
            <div className="flex flex-col items-center gap-2">
              <AvatarInitial
                label={user?.email}
                seed={user?.id}
                className="h-8 w-8"
              />

              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                title="Toggle theme"
              >
                {isDark ? "L" : "D"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 min-w-0">
                <AvatarInitial
                  label={user?.email}
                  seed={user?.id}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">
                    {user?.email ?? "No account"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Role: {role ?? "—"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="w-full h-8 flex items-center justify-center rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              >
                {isDark ? "Light mode" : "Dark mode"}
              </button>

              <button
                onClick={() => {
                  void signOut();
                  onNavigate?.();
                }}
                className="w-full h-8 flex items-center justify-center gap-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* COLLAPSE BUTTON */}
        {!mobile && (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
              "hover:bg-sidebar-accent text-muted-foreground",
              compact ? "mx-auto" : "ml-auto"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <PanelLeft className="h-5 w-5" />
            </motion.div>
          </button>
        )}
      </div>
    </>
  );

  if (mobile) {
    return (
      <aside className="flex h-full flex-col overflow-hidden bg-transparent">
        {content}
      </aside>
    );
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="hidden h-screen flex-col overflow-hidden bg-transparent py-4 md:flex"
    >
      {content}
    </motion.aside>
  );
};