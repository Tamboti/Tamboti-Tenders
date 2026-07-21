import { Tender, WORKFLOW_STATUSES } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime, daysUntil } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SourceLanguageBadge, TranslationStatusBadge } from "./LanguageBadges";
import { getLanguageName, isNonEnglishSource, OUTPUT_LANGUAGES } from "@/lib/tenderLanguage";
import { resolveCountryDisplay } from "@/lib/countries";
import { useCountryReference } from "@/hooks/use-country-reference";
import {
  ExternalLink,
  Calendar,
  MapPin,
  Building2,
  Tag,
  DollarSign,
  Clock,
  Layers,
  Globe,
  Sparkles,
  Bookmark,
  BookmarkCheck,
} from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { handleDbError } from "@/lib/dbError";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { User } from "iconoir-react";

/* ─── tiny helpers ──────────────────────────────────────────────── */

const Field = ({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {label}
    </span>
    <span className="text-[14px] font-medium text-foreground leading-snug">{value}</span>
  </div>
);

const DeadlineBadge = ({ days }: { days: number | null }) => {
  if (days == null) return null;
  const isOverdue = days < 0;
  const isSoon = days >= 0 && days < 7;
  return (
    <span
      className={cn(
        "ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
        isOverdue && "bg-destructive/10 text-destructive",
        isSoon && !isOverdue && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        !isOverdue && !isSoon && "bg-muted text-muted-foreground",
      )}
    >
      {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
    </span>
  );
};

const Divider = () => <hr className="border-border/60" />;

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
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
      {iso2 ? (
        <span className={cn("fi rounded-[2px] shadow-sm", `fi-${iso2}`)} aria-hidden="true" />
      ) : (
        <Globe className="h-3 w-3 shrink-0 opacity-70" />
      )}
      <span className="line-clamp-1">{name}</span>
    </span>
  );
};

/* ─── main component ────────────────────────────────────────────── */

export const TenderDetail = ({
  tender,
  onChanged,
}: {
  tender: Tender;
  onChanged?: () => void;
}) => {
  const { user } = useAuth();
  const [status, setStatus] = useState(tender.workflow_status);
  const [updating, setUpdating] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const dDays = daysUntil(tender.deadline);

  // ── English / Original toggle (title + description only) ──
  const [titleView, setTitleView] = useState<"en" | "original">("en");

  // ── Output language picker (AI summary only) ──
  const [summaryLang, setSummaryLang] = useState("en");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [translationCache, setTranslationCache] = useState<
    Record<string, { title: string; summary: string }>
  >({});

  useEffect(() => {
    setStatus(tender.workflow_status);
  }, [tender.workflow_status]);

  // Reset per-tender UI state when navigating to a different tender — this
  // component instance is reused across tenders, not remounted.
  useEffect(() => {
    setTitleView(tender.translation_status === "failed" ? "original" : "en");
    setSummaryLang("en");
    setSummaryError(null);
    setTranslationCache({});
  }, [tender.id, tender.translation_status]);

  useEffect(() => {
    if (summaryLang === "en") {
      setSummaryError(null);
      return;
    }
    if (!tender.summary_en) return;
    if (translationCache[summaryLang]) return;

    let cancelled = false;
    const run = async () => {
      setSummaryLoading(true);
      setSummaryError(null);

      const { data: cached, error: cacheError } = await supabase
        .from("tender_translations")
        .select("title, summary")
        .eq("tender_id", tender.id)
        .eq("lang", summaryLang)
        .maybeSingle();

      if (cancelled) return;

      if (!cacheError && cached?.title && cached?.summary) {
        setTranslationCache((c) => ({ ...c, [summaryLang]: { title: cached.title!, summary: cached.summary! } }));
        setSummaryLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("translate-tender", {
        body: { tender_id: tender.id, lang: summaryLang },
      });

      if (cancelled) return;
      setSummaryLoading(false);

      if (error) {
        const httpStatus = (error as { context?: Response }).context?.status;
        setSummaryError(
          httpStatus === 422
            ? "Summary not ready yet, try again shortly."
            : "Couldn't load this translation right now — showing the English summary."
        );
        return;
      }

      if (data?.title && data?.summary) {
        setTranslationCache((c) => ({ ...c, [summaryLang]: { title: data.title, summary: data.summary } }));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [summaryLang, tender.id, tender.summary_en, translationCache]);

  useEffect(() => {
    if (!user) {
      setIsBookmarked(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("tender_bookmarks")
      .select("tender_id")
      .eq("user_id", user.id)
      .eq("tender_id", tender.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsBookmarked(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user, tender.id]);

  const updateStatus = async (next: string) => {
    const previous = status;
    setStatus(next); // optimistic — the RPC is the source of truth, roll back below on error
    setUpdating(true);
    const { error } = await supabase.rpc("set_workflow_status", {
      _tender_id: tender.id,
      _status: next,
    });
    setUpdating(false);
    if (error) {
      setStatus(previous);
      toast.error(handleDbError(error));
      return;
    }
    toast.success(`Status updated to ${next}`);
    onChanged?.();
  };

  const toggleBookmark = async () => {
    if (!user) {
      toast.error("Sign in to save tenders");
      return;
    }
    setBookmarkBusy(true);
    if (isBookmarked) {
      const { error } = await supabase
        .from("tender_bookmarks")
        .delete()
        .eq("user_id", user.id)
        .eq("tender_id", tender.id);
      setBookmarkBusy(false);
      if (error) return toast.error(handleDbError(error));
      setIsBookmarked(false);
      toast.success("Removed from bookmarks");
    } else {
      const { error } = await supabase
        .from("tender_bookmarks")
        .insert({ user_id: user.id, tender_id: tender.id });
      setBookmarkBusy(false);
      if (error) return toast.error(handleDbError(error));
      setIsBookmarked(true);
      toast.success("Saved to bookmarks");
    }
    onChanged?.();
  };

  // ── Derived English/Original display values ──
  const nonEnglishSource = isNonEnglishSource(tender.source_language);
  const hasEnglishVersion = !!(tender.title_en || tender.description_en);
  const showTitleToggle = nonEnglishSource && hasEnglishVersion;
  const effectiveTitleView = showTitleToggle ? titleView : "original";
  const displayedTitle = effectiveTitleView === "en" ? tender.title_en ?? tender.title : tender.title;
  const displayedDescription =
    effectiveTitleView === "en" ? tender.description_en ?? tender.description : tender.description;
  const showFailedNote = nonEnglishSource && tender.translation_status === "failed";
  const showPendingNote = nonEnglishSource && tender.translation_status === "pending" && !hasEnglishVersion;

  // ── Derived output-language summary display values ──
  const translatedEntry = translationCache[summaryLang];
  const displayedSummary = summaryLang === "en" ? tender.summary_en : translatedEntry?.summary ?? tender.summary_en;

  /* Build only the fields that have values */
  const metaFields: { icon?: any; label: string; value: React.ReactNode }[] = [
    tender.procuring_entity && {
      icon: Building2,
      label: "Procuring entity",
      value: tender.procuring_entity,
    },
    tender.country && {
      icon: Globe,
      label: "Country",
      value: <CountryChip country={tender.country} countryIso2={tender.country_iso2} />,
    },
    tender.category && { icon: Tag, label: "Category", value: tender.category },
    tender.procurement_type && {
      label: "Procurement type",
      value: tender.procurement_type,
    },
    tender.deadline && {
      icon: Calendar,
      label: "Deadline",
      value: (
        <span>
          {formatDate(tender.deadline)}
          <DeadlineBadge days={dDays} />
        </span>
      ),
    },
    tender.publication_date && {
      label: "Published",
      value: formatDate(tender.publication_date),
    },
    tender.estimated_value_usd && {
      icon: DollarSign,
      label: "Estimated value",
      value: formatCurrency(tender.estimated_value_usd),
    },
    tender.original_currency && {
      label: "Currency",
      value: tender.original_currency,
    },
    tender.participation_fee && {
      label: "Participation fee",
      value: `${tender.participation_fee} ${tender.original_currency}`,
    },
    (tender.location_region || tender.location_district) && {
      icon: MapPin,
      label: "Location",
      value: [tender.location_region, tender.location_district]
        .filter(Boolean)
        .join(", "),
    },
    tender.contact_information && {
      icon: User,
      label: "Contact information",
      value: tender.contact_information,
    },
    tender.lot_count && { icon: Layers, label: "Lots", value: tender.lot_count },
    tender.contract_duration_days && {
      icon: Clock,
      label: "Contract duration",
      value: `${tender.contract_duration_days} days`,
    },
  ].filter(Boolean) as { icon?: any; label: string; value: React.ReactNode }[];

  return (
    <div className="space-y-6 pb-2">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* top-row: badge, ref, source */}
        <div className="flex justify-between items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {tender.reference_number && (
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                {tender.reference_number}
              </code>
            )}
            {tender.source && (
              <span className="text-[12px] text-muted-foreground">{tender.source}</span>
            )}
            <SourceLanguageBadge sourceLanguage={tender.source_language} />
            <TranslationStatusBadge status={tender.translation_status} />
          </div>

          {tender.source_url && tender.source !== "tanzania" && (
           <a
           href={tender.source_url}
           target="_blank"
           rel="noreferrer"
           className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
         >
           <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
           View source
         </a>
          )}


        </div>

        {/* title */}
        <h2 className="text-xl font-semibold leading-snug tracking-tight text-foreground">
          {displayedTitle}
        </h2>

        {showTitleToggle && (
          <Tabs value={titleView} onValueChange={(v) => setTitleView(v as "en" | "original")} className="w-fit">
            <TabsList className="h-8 p-0.5">
              <TabsTrigger value="en" className="h-7 px-2.5 text-[11.5px]">
                English
              </TabsTrigger>
              <TabsTrigger value="original" className="h-7 px-2.5 text-[11.5px]">
                Original ({getLanguageName(tender.source_language)})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {showFailedNote && (
          <p className="text-[12px] text-muted-foreground">
            English translation could not be generated — showing the original ({getLanguageName(tender.source_language)}).
          </p>
        )}
        {showPendingNote && (
          <p className="text-[12px] text-muted-foreground">
            English translation is still pending — showing the original ({getLanguageName(tender.source_language)}).
          </p>
        )}

        {/* actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Select value={status} onValueChange={updateStatus} disabled={updating}>
            <SelectTrigger id="workflow-status" className="h-8 w-auto gap-1.5 text-xs">
              <SelectValue placeholder="Set status" />
            </SelectTrigger>
            <SelectContent>
              {WORKFLOW_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-sm">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={toggleBookmark}
            disabled={bookmarkBusy}
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? "Remove bookmark" : "Save tender"}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              bookmarkBusy && "cursor-not-allowed opacity-50"
            )}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-foreground" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Divider />

      {/* ── Meta grid ────────────────────────────────────────────── */}
      {metaFields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          {metaFields.map((f, i) => (
            <Field key={i} icon={f.icon} label={f.label} value={f.value} />
          ))}
        </div>
      )}

      {/* ── AI Summary ───────────────────────────────────────────── */}
      {tender.summary_en && (
        <>
          <Divider />
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold tracking-wide text-foreground">
                AI summary
              </h3>
              <Select value={summaryLang} onValueChange={setSummaryLang}>
                <SelectTrigger className="h-7 w-[9.5rem] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code} className="text-sm">
                      {l.nativeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-r-md border-l-4 border border-primary/15 bg-gradient-to-br from-primary/[0.06] via-background to-muted/30 px-4 py-3.5 shadow-sm">
              {summaryLoading ? (
                <div className="space-y-2">
                  <div className="h-3.5 w-full animate-pulse rounded bg-muted/70" />
                  <div className="h-3.5 w-[85%] animate-pulse rounded bg-muted/70" />
                  <div className="h-3.5 w-[60%] animate-pulse rounded bg-muted/70" />
                </div>
              ) : (
                <div className="space-y-2">
                  {summaryError && (
                    <p className="text-[11.5px] font-medium text-amber-600 dark:text-amber-400">
                      {summaryError}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {displayedSummary}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Description ──────────────────────────────────────────── */}
      {displayedDescription && (
        <>
          <Divider />
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Description
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {displayedDescription}
            </p>
          </div>
        </>
      )}

      {/* ── Footer meta ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        {tender.scraped_at && <span>Scraped {formatDateTime(tender.scraped_at)}</span>}
        {tender.updated_at && <span>Updated {formatDateTime(tender.updated_at)}</span>}
        {tender.enrichment_status && <span>Enrichment: {tender.enrichment_status}</span>}
      </div>
    </div>
  );
};
