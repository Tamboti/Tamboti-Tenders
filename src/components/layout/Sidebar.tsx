import { NavLink } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeft, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { visibleNavSections } from "./nav.ts";
import { AvatarInitial } from "@/components/AvatarInitial";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LOGO_URL } from "@/lib/brand";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", member: "Member" };

type SidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

export const Sidebar = ({ mobile = false, onNavigate }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { role, isAdmin } = useUserRole();
  const navSections = visibleNavSections(isAdmin);

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
          {!mobile && (
            <img
              src={LOGO_URL}
              alt="Tender Compass"
              className="h-9 w-9 object-contain shrink-0"
            />
          )}

          {!compact && (
            <h1 className="text-base font-semibold tracking-tight truncate text-foreground">
              {isAdmin ? "Admin dashboard" : "My portal"}
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
                className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70"
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
                    "group flex rounded-lg text-sm font-medium transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar-background",
                    compact
                      ? "justify-center items-center h-10 w-10 mx-auto"
                      : "items-center gap-2.5 px-3 py-2",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/25"
                      : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
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

      {/* BOTTOM PANEL — a single slim row rather than a stacked card, so
          adding more nav sections over time doesn't eat into the space
          available for tabs above (this used to be ~3 stacked rows). */}
      <div className="border-t border-sidebar-border px-2 py-2 space-y-2">
        {compact ? (
          <div className="flex flex-col items-center gap-2 p-2">
            <AvatarInitial
              label={user?.email}
              seed={user?.id}
              className="h-8 w-8"
              title={user?.email ? `${user.email} · ${role ?? "—"}` : undefined}
            />
            <ThemeToggle className="h-8 w-8 shrink-0" />
            <button
              onClick={() => {
                void signOut();
                onNavigate?.();
              }}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md text-destructive bg-destructive/10 hover:bg-destructive/15 transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1 py-1">
              <AvatarInitial
                label={user?.email}
                seed={user?.id}
                className="shrink-0"
                title={user?.email ? `${user.email} · ${role ?? "—"}` : undefined}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {user?.email ?? "No account"}
                </p>
                {role && (
                  <p className="truncate text-[11px] text-muted-foreground">{ROLE_LABEL[role] ?? role}</p>
                )}
              </div>
              <ThemeToggle className="h-8 w-8 shrink-0" />
            </div>

            <button
              onClick={() => {
                void signOut();
                onNavigate?.();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar-background"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </>
        )}

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
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="hidden h-screen flex-col overflow-hidden border-r border-sidebar-border bg-sidebar-background py-2 md:flex"
    >
      {content}
    </motion.aside>
  );
};