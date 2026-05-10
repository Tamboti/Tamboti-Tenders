import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tender } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { daysUntil, formatDate } from "@/lib/format";
import { ArrowRight, Building2, Globe, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TenderQuickViewProps {
  tender: Tender | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTenderChanged: () => void;
}

const DeadlinePill = ({ deadline }: { deadline: string | null }) => {
  const d = daysUntil(deadline);
  if (d == null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
        d < 0 && "bg-destructive/10 text-destructive",
        d === 0 && "bg-destructive/20 text-destructive font-semibold",
        d >= 1 && d <= 7 && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        d > 7 && "bg-muted text-muted-foreground"
      )}
    >
      <Clock className="h-2.5 w-2.5 shrink-0" />
      {d < 0 ? `${Math.abs(d)}d ago` : d === 0 ? "Today" : `${d}d left`}
    </span>
  );
};

export const TenderQuickView = ({
  tender,
  open,
  onOpenChange,
}: TenderQuickViewProps) => {
  const navigate = useNavigate();

  const goToFullPage = () => {
    onOpenChange(false);
    navigate(`/tender/${tender?.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md border-l border-border/60"
      >
        {tender && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-0 shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Quick view
              </span>
              
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              {/* Status + deadline */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={tender.workflow_status} />
                <DeadlinePill deadline={tender.deadline} />
                {tender.deadline && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatDate(tender.deadline)}
                  </span>
                )}
              </div>

              {/* Title + translation */}
              <div className="space-y-2">
                <h2 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                  {tender.title}
                </h2>
                {tender.title_cs && (
                  <p className="text-[13px] leading-snug text-muted-foreground">
                    {tender.title_cs}
                  </p>
                )}
              </div>

              {/* Entity + country */}
              <div className="space-y-3">
                {tender.procuring_entity && (
                  <div className="flex items-start gap-2.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/50" />
                    <span className="text-[13px] text-foreground leading-snug">
                      {tender.procuring_entity}
                    </span>
                  </div>
                )}
                {tender.country && (
                  <div className="flex items-center gap-2.5">
                    <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                    <span className="text-[13px] text-foreground">
                      {tender.country}
                    </span>
                  </div>
                )}
              </div>

              {/* Summaries */}
              {(tender.summary_en || tender.summary_cs) && (
                <>
                  <div className="border-t border-border/40" />
                  <div className="space-y-4">
                    {tender.summary_en && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                          Summary (EN)
                        </p>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                          {tender.summary_en}
                        </p>
                      </div>
                    )}
                    {tender.summary_cs && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                          Summary (CS)
                        </p>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">
                          {tender.summary_cs}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer CTA */}
            <div className="shrink-0 px-6 py-5 border-t border-border/50">
              <Button className="w-full gap-2 h-10" onClick={goToFullPage}>
                View full details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};