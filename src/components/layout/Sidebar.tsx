import { NavLink } from "react-router-dom";
import { LayoutDashboard, Bell, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Tenders", icon: LayoutDashboard },
  { to: "/alerts", label: "Alerts", icon: Bell },
];

export const Sidebar = () => {

  return (
    <aside className="w-60 border-r border-sidebar-border bg-sidebar flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
            <FileText className="h-4 w-4 text-accent-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold text-sidebar-foreground">TenderIntel</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Internal</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

    
  );
};
