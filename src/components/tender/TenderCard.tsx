import { motion } from "framer-motion";
import { Tender } from "@/lib/types";
import { displayTitle } from "@/lib/tenderLanguage";
import { resolveCountryDisplay } from "@/lib/countries";
import { useCountryReference } from "@/hooks/use-country-reference";
import { SourceLanguageBadge, TranslationStatusBadge } from "@/components/tender/LanguageBadges";
import { daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Clock, Globe, Bookmark, BookmarkCheck } from "@/components/icons";

export const CountryChip = ({
  country,
  countryIso2,
  compact = false,
}: {
  country: string | null | undefined;
  countryIso2?: string | null;
  compact?: boolean;
}) => {
  const { byIso2 } = useCountryReference();
  const { name, iso2 } = resolveCountryDisplay(country, countryIso2, byIso2);
  if (!name) {
    return <span className="text-sm text-muted-foreground/35">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full   text-muted-foreground",
        compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-[12px]"
      )}
    >
      {iso2 ? (
        <span className={cn("fi rounded-[2px] shadow-sm", `fi-${iso2}`)} aria-hidden="true" />
      ) : (
        <Globe className="h-3 w-3 shrink-0 opacity-70" />
      )}
      <span className="line-clamp-1">{name}</span>
    </span>
  );
};

/* ── Deadline pill ───────────────────────────────────────────────── */
export const DeadlinePill = ({ deadline }: { deadline: string | null }) => {
  const d = daysUntil(deadline);
  if (d == null) return <span className="text-muted-foreground text-xs">—</span>;
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
      {d < 0 ? `${Math.abs(d)}d ago` : d === 0 ? "Today" : `${d}d`}
    </span>
  );
};

/* ── Tender card ─────────────────────────────────────────────────── */
export const TenderCard = ({
  t,
  onClick,
  idx = 0,
  isBookmarked,
  onToggleBookmark,
}: {
  t: Tender;
  onClick: () => void;
  idx?: number;
  // Optional — cards rendered somewhere without bookmark state (or a
  // signed-out visitor) just skip the button rather than requiring it.
  isBookmarked?: boolean;
  onToggleBookmark?: (e: React.MouseEvent) => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.25) }}
      className="relative rounded-lg border border-border/70 bg-card p-4 shadow-sm cursor-pointer active:bg-muted/30 active:scale-[0.99] transition-all"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
            {displayTitle(t)}
          </p>

          {(t.procuring_entity || t.reference_number) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {t.procuring_entity && (
                <span className="line-clamp-1">{t.procuring_entity}</span>
              )}
              {t.reference_number && (
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
                  {t.reference_number}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <DeadlinePill deadline={t.deadline} />
            {t.country && (
              <CountryChip country={t.country} countryIso2={t.country_iso2} compact />
            )}
            {t.category && (
              <span className="inline-flex max-w-[9rem] rounded-full border border-border/70 bg-muted/35 px-2 py-0.5 text-[11px] font-semibold leading-none text-muted-foreground">
                <span className="truncate">{t.category}</span>
              </span>
            )}
            <SourceLanguageBadge sourceLanguage={t.source_language} />
            <TranslationStatusBadge status={t.translation_status} />
          </div>

          {t.summary_en && (
            <p className="text-[11px] text-muted-foreground/75 line-clamp-2 mt-1">
              {t.summary_en}
            </p>
          )}
        </div>

        {onToggleBookmark && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleBookmark(e); }}
            className={cn(
              "shrink-0 -mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              isBookmarked ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"
            )}
            aria-label={isBookmarked ? "Remove bookmark" : "Save tender"}
            aria-pressed={isBookmarked}
          >
            {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        )}
      </div>
    </motion.div>
  );
};
