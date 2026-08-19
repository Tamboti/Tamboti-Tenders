import { NavLink } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeft, LogOut, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { visibleNavSections } from "./nav.ts";
import { AvatarInitial } from "@/components/AvatarInitial";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LOGO_URL, SITE_NAME } from "@/lib/brand";

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
  // Admins mostly live in Sources/Analytics/Blog, not the Tenders/Bookmarks/
  // Alerts personal section — a tighter, denser nav reflects that this
  // sidebar is a tool they scan quickly, not a member's small personal menu.
  const dense = isAdmin && !compact;

  const content = (
    <>
      {/* LOGO — fixed header, outside the scroll area so it never scrolls
          out of view no matter how long the nav list gets. */}
      <div
        className={cn(
          "shrink-0 flex items-center border-b border-sidebar-border",
          compact ? "justify-center px-2 py-3" : "gap-2 px-4 py-3"
        )}
      >
        {!mobile && (
          <img
            src={LOGO_URL}
            alt={SITE_NAME}
            className="h-7 w-7 object-contain shrink-0"
          />
        )}

        {!compact && (
          <h1 className="text-sm font-semibold tracking-tight truncate text-foreground">
            {isAdmin ? "Admin dashboard" : "My portal"}
          </h1>
        )}
      </div>

      {/* NAV */}
      <nav className={cn("flex-1 overflow-y-auto px-2 py-2", dense ? "space-y-2" : "space-y-4")}>
        {/* SECTIONS */}
        {navSections.map((section, idx) => (
          <div
            key={idx}
            className={cn(
              "space-y-1",
              compact && "space-y-2",
              dense && section.heading === "Personal" && "mt-2 border-t border-sidebar-border pt-2"
            )}
          >
            {section.heading && !compact && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70",
                  dense ? "pt-1 pb-0.5" : "pt-2 pb-1"
                )}
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
                    "group flex rounded-lg font-medium transition-colors duration-150",
                    dense ? "text-[13px]" : "text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar-background",
                    compact
                      ? "justify-center items-center h-10 w-10 mx-auto"
                      : dense
                      ? "items-center gap-2 px-2.5 py-1.5"
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
                        "shrink-0 transition-colors",
                        dense ? "h-4 w-4" : "h-5 w-5",
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
            <NavLink
              to="/"
              onClick={onNavigate}
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
              aria-label="Go to main site"
              title="Go to main site"
            >
              <Home className="h-4 w-4" />
            </NavLink>
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

            <div className="flex items-center gap-1.5">
              <NavLink
                to="/"
                onClick={onNavigate}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar-background"
              >
                <Home className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Main site</span>
              </NavLink>

              <button
                onClick={() => {
                  void signOut();
                  onNavigate?.();
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar-background"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Sign out</span>
              </button>
            </div>
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
      className="hidden h-dvh flex-col overflow-hidden border-r border-sidebar-border bg-sidebar-background md:flex"
    >
      {content}
    </motion.aside>
  );
};