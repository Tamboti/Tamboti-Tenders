import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tender } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { daysUntil, formatDate } from "@/lib/format";
import { displayTitle } from "@/lib/tenderLanguage";
import { SourceLanguageBadge, TranslationStatusBadge } from "@/components/tender/LanguageBadges";
import { resolveCountryDisplay } from "@/lib/countries";
import { useCountryReference } from "@/hooks/use-country-reference";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Building2, Globe, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { splitIntoParagraphs } from "@/lib/textFormat";

interface TenderQuickViewProps {
  tender: Tender | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTenderChanged: () => void;
}

const CountryChip = ({
  country,
  countryIso2,
}: {
  country: string | null | undefined;
  countryIso2?: string | null;
}) => {
  const { byIso2 } = useCountryReference();
  const { name, iso2 } = resolveCountryDisplay(country, countryIso2, byIso2);
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 text-[12px] text-muted-foreground">
      {iso2 ? (
        <span className={cn("fi rounded-[2px] shadow-sm", `fi-${iso2}`)} aria-hidden="true" />
      ) : (
        <Globe className="h-3 w-3 shrink-0 opacity-70" />
      )}
      <span className="line-clamp-1">{name}</span>
    </span>
  );
};

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

  // `tender` here is a row from the list query, which only carries the
  // compact columns used for the table/cards (see TENDER_LIST_COLUMNS) —
  // description isn't among them, so it's fetched separately once the panel
  // actually opens rather than bloating every row in the list fetch.
  const [description, setDescription] = useState<string | null>(null);
  const [descriptionLoading, setDescriptionLoading] = useState(false);

  useEffect(() => {
    if (!open || !tender?.id) {
      setDescription(null);
      return;
    }
    let cancelled = false;
    setDescriptionLoading(true);
    supabase
      .from("tenders")
      .select("description, description_en")
      .eq("id", tender.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setDescriptionLoading(false);
        setDescription((data?.description_en ?? data?.description) || null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tender?.id]);

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
                <SourceLanguageBadge sourceLanguage={tender.source_language} />
                <TranslationStatusBadge status={tender.translation_status} />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <h2 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                  {displayTitle(tender)}
                </h2>
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
                    <CountryChip country={tender.country} countryIso2={tender.country_iso2} />
                  </div>
                )}
              </div>

              {/* Summary */}
              {tender.summary_en && (
                <>
                  <div className="border-t border-border/40" />
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      Summary
                    </p>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {tender.summary_en}
                    </p>
                  </div>
                </>
              )}

              {/* Description — just a teaser here (paragraph 1, clamped),
                  faded out at the bottom since this is a preview panel, not
                  the full read. "View full details" below is the way to
                  read the rest, formatted into paragraphs on that page. */}
              {(descriptionLoading || description) && (
                <>
                  <div className="border-t border-border/40" />
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                      Description
                    </p>
                    {descriptionLoading ? (
                      <div className="space-y-1.5">
                        <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
                        <div className="h-3 w-[85%] animate-pulse rounded bg-muted/60" />
                        <div className="h-3 w-[60%] animate-pulse rounded bg-muted/60" />
                      </div>
                    ) : (
                      <div className="relative">
                        <p className="line-clamp-4 text-[13px] leading-relaxed text-muted-foreground">
                          {splitIntoParagraphs(description!)[0]}
                        </p>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background to-transparent" />
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