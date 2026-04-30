import { Sparkles, LifeBuoy, User, FileText } from "lucide-react";

export const TopBar = () => {
  return (
    <header className="h-14 border-b border-border bg-[hsl(var(--header-background,var(--background)))] flex items-center justify-between px-4 sticky top-0 z-20">
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-accent-foreground" />
        </div>
        <div className="px-3 py-1.5 rounded-md border border-border bg-card text-sm font-medium text-foreground truncate max-w-[260px]">
          TenderIntel · Internal Workspace
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button className="flex items-center gap-1.5 px-3 h-8 rounded-md text-sm text-foreground hover:bg-secondary transition-colors">
          <Sparkles className="h-4 w-4 text-accent" />
          <span>Ask AI</span>
        </button>
        <button className="flex items-center gap-1.5 px-3 h-8 rounded-md text-sm text-foreground hover:bg-secondary transition-colors">
          <LifeBuoy className="h-4 w-4 text-muted-foreground" />
          <span>Support</span>
        </button>
        <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground transition-colors">
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
