import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export const StatTile = ({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) => (
  <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </div>
    <div className="mt-1.5 text-2xl font-semibold text-foreground">{value}</div>
  </div>
);
