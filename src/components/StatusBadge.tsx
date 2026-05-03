import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

export const StatusBadge = ({ status }: { status: string }) => {
  const cls = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("font-medium border inline-flex max-w-full rounded-lg   px-2 py-1 text-[11px] leading-none text-muted-foreground", cls)}>
      {status}
    </Badge>
  );
};
