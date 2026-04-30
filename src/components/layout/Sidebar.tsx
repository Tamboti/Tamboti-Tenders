import { NavLink } from "react-router-dom";
import {
  Home,
  Clock,
  Globe,
  FileSearch,
  BarChart3,
  Bell,
  Bookmark,
  Database,
  ShieldCheck,
  Settings,
  PanelLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  to?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hasChildren?: boolean;
  disabled?: boolean;
};

type NavSection = {
  heading?: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    items: [
      { to: "/", label: "Account home", icon: Home },
      { label: "Recents", icon: Clock, hasChildren: true, disabled: true },
      { label: "Sources", icon: Globe, hasChildren: true, disabled: true },
    ],
  },
  {
    heading: "Observe",
    items: [
      { to: "/", label: "Tenders", icon: FileSearch },
      { label: "Analytics", icon: BarChart3, hasChildren: true, disabled: true },
    ],
  },
  {
    heading: "Engage",
    items: [
      { to: "/alerts", label: "Alerts", icon: Bell },
      { label: "Bookmarks", icon: Bookmark, hasChildren: true, disabled: true },
    ],
  },
  {
    heading: "Manage",
    items: [
      { label: "Data & scrapes", icon: Database, hasChildren: true, disabled: true },
      { label: "Access control", icon: ShieldCheck, hasChildren: true, disabled: true },
      { label: "Settings", icon: Settings, hasChildren: true, disabled: true },
    ],
  },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Quick search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Quick search..."
            className="w-full h-8 pl-8 pr-12 text-sm bg-secondary/60 border border-transparent hover:border-border focus:border-border focus:bg-background rounded-md outline-none transition-colors text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground bg-background border border-border rounded px-1 py-0.5">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {section.heading && (
              <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                {section.heading}
              </div>
            )}
            {section.items.map((item) => {
              const content = (
                <>
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hasChildren && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </>
              );

              const baseClasses =
                "group flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-normal transition-colors";

              if (!item.to || item.disabled) {
                return (
                  <div
                    key={item.label}
                    className={cn(
                      baseClasses,
                      "text-sidebar-foreground hover:bg-sidebar-accent cursor-pointer",
                      item.disabled && "opacity-90"
                    )}
                  >
                    {content}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      baseClasses,
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )
                  }
                >
                  {content}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse */}
      <div className="px-3 py-2 border-t border-sidebar-border">
        <button className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-muted-foreground">
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};
