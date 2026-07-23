import { NavLink } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeft, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { visibleNavSections } from "./nav.ts";
import { AvatarInitial } from "@/components/AvatarInitial";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type SidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

const SunIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const Sidebar = ({ mobile = false, onNavigate }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { role, isAdmin } = useUserRole();
  const { resolvedTheme, setTheme } = useTheme();
  const navSections = visibleNavSections(isAdmin);

  const isDark = resolvedTheme === "dark";
  const compact = mobile ? false : collapsed;

  const ThemeToggle = ({ isCompact }: { isCompact?: boolean }) =>
    isCompact ? (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        title={isDark ? "Switch to light" : "Switch to dark"}
      >
        {isDark
          ? <SunIcon className="h-4 w-4" />
          : <MoonIcon className="h-4 w-4" />
        }
      </button>
    ) : (
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          {isDark
            ? <MoonIcon className="h-3.5 w-3.5 text-muted-foreground" />
            : <SunIcon className="h-3.5 w-3.5 text-muted-foreground" />
          }
          <Label
            htmlFor="theme-switch"
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            {isDark ? "Dark mode" : "Light mode"}
          </Label>
        </div>
        <Switch
          id="theme-switch"
          checked={isDark}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          className="scale-90"
        />
      </div>
    );

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
          {!mobile && (
            <img
              src="https://luykyredvhhcamcmgahp.supabase.co/storage/v1/object/public/Company%20assets/Gemini_Generated_Image_k92dq5k92dq5k92d-removebg-preview.png"
              alt="Tender Compass"
              className="h-9 w-9 object-contain shrink-0"
            />
          )}

          {!compact && (
            <h1 className="text-base font-semibold tracking-tight truncate text-foreground">
              Admin dashboard
            </h1>
          )}
        </div>

        {/* SECTIONS */}
        {navSections.map((section, idx) => (
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
                      ? "bg-background shadow-sm border border-border text-primary font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />

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
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* BOTTOM PANEL */}
      <div className="px-2 py-2  space-y-2">
        <div
          className={cn(
            "rounded-md bg-background/80 shadow-sm ",
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
              <ThemeToggle isCompact />
            </div>
          ) : (
            <div className="space-y-2.5">
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

              <ThemeToggle />

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