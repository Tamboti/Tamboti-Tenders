import { Tender, WORKFLOW_STATUSES, STATUS_COLORS } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime, daysUntil } from "@/lib/format";
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
import { ExternalLink, Globe, Bookmark, BookmarkCheck, Lock, Sparkles } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { handleDbError } from "@/lib/dbError";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import { isPlanLimitError, isWithinFreeVisibilityWindow, FREE_VISIBILITY_DAYS } from "@/lib/plan";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { splitIntoParagraphs } from "@/lib/textFormat";

/* ─── tiny helpers ──────────────────────────────────────────────── */

// Plain label-over-value pairs, no icons or card chrome — this is meant to
// read like a document's front-matter (procurement-notice style), not a UI
// panel of stat tiles.
const MetaItem = ({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">{label}</span>
    <span className={cn("text-[15px] font-medium leading-snug text-foreground", valueClassName)}>{value}</span>
  </div>
);

// Plain grey skeleton bars read as "this is broken/slow", not "AI is
// working on it" — a sparkles icon + bouncing dots (the classic typing-
// indicator pattern) makes it obviously an active AI task, not a stall.
const AIWorkingBadge = ({ label }: { label: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
    <Sparkles className="h-3 w-3 animate-pulse" />
    {label}
    <span className="flex items-center gap-0.5">
      <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
      <span className="h-1 w-1 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
      <span className="h-1 w-1 animate-bounce rounded-full bg-primary" />
    </span>
  </span>
);

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
  const navigate = useNavigate();
  const { isPro } = useSubscription();
  const [status, setStatus] = useState(tender.workflow_status);
  const [updating, setUpdating] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const dDays = daysUntil(tender.deadline);

  // ── English / Original toggle (title + description only) ──
  const [titleView, setTitleView] = useState<"en" | "original">("en");

  // ── Output language picker (drives the title + AI summary; translate-tender
  // only translates those two — Description stays on the English/Original
  // toggle above) ──
  const [summaryLang, setSummaryLang] = useState("en");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [translationCache, setTranslationCache] = useState<Record<string, { title: string; summary: string }>>({});
  const [descExpanded, setDescExpanded] = useState(false);

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
    setDescExpanded(false);
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
      trackEvent("bookmark_toggle", { action: "remove", tender_id: tender.id });
    } else {
      const { error } = await supabase
        .from("tender_bookmarks")
        .insert({ user_id: user.id, tender_id: tender.id });
      setBookmarkBusy(false);
      if (error) {
        if (isPlanLimitError(error)) {
          toast.error("Free plan limit reached — up to 5 bookmarks. Upgrade to Pro for unlimited.", {
            action: { label: "Upgrade", onClick: () => navigate("/pricing") },
          });
          return;
        }
        return toast.error(handleDbError(error));
      }
      setIsBookmarked(true);
      toast.success("Saved to bookmarks");
      trackEvent("bookmark_toggle", { action: "add", tender_id: tender.id });
    }
    onChanged?.();
  };

  // ── Derived English/Original display values ──
  const nonEnglishSource = isNonEnglishSource(tender.source_language);
  const hasEnglishVersion = !!(tender.title_en || tender.description_en);
  // Hidden once a non-English output language is picked below — "English /
  // Original" stops making sense once the text on screen is e.g. Portuguese.
  const showTitleToggle = nonEnglishSource && hasEnglishVersion && summaryLang === "en";
  const effectiveTitleView = showTitleToggle ? titleView : "original";
  const englishOrOriginalTitle = effectiveTitleView === "en" ? tender.title_en ?? tender.title : tender.title;
  const englishOrOriginalDescription =
    effectiveTitleView === "en" ? tender.description_en ?? tender.description : tender.description;
  const showFailedNote = nonEnglishSource && tender.translation_status === "failed";
  const showPendingNote = nonEnglishSource && tender.translation_status === "pending" && !hasEnglishVersion;

  // ── Derived output-language display values (title + summary share one
  // language picker, see the header — translate-tender doesn't cover
  // Description, which stays on the English/Original toggle above) ──
  const translatedEntry = translationCache[summaryLang];
  // Falls back to the English/Original title while a non-English translation
  // is still loading (or failed) — only swaps once it's actually cached.
  const displayedTitle = summaryLang === "en" ? englishOrOriginalTitle : translatedEntry?.title ?? englishOrOriginalTitle;
  const displayedSummary = summaryLang === "en" ? tender.summary_en : translatedEntry?.summary ?? tender.summary_en;
  const displayedDescription = englishOrOriginalDescription;
  // Scraped descriptions are frequently one giant run-on block (see
  // splitIntoParagraphs) — collapsed by default past a certain length so the
  // page isn't dominated by a wall of text, with a "Show more" to expand.
  const descriptionParagraphs = displayedDescription ? splitIntoParagraphs(displayedDescription) : [];
  const isLongDescription = descriptionParagraphs.length > 2 || (displayedDescription?.length ?? 0) > 480;

  // Deadline urgency — same red/amber treatment the old standalone
  // DeadlineCard used, now just the value of a meta field instead of its
  // own boxed callout.
  const deadlineValueClass =
    dDays == null ? undefined : dDays < 0 ? "text-destructive" : dDays < 7 ? "text-amber-700 dark:text-amber-400" : undefined;
  const deadlineValue = tender.deadline ? (
    <>
      {formatDate(tender.deadline)}
      {dDays != null && (
        <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
          ({dDays < 0 ? `${Math.abs(dDays)}d overdue` : `${dDays}d left`})
        </span>
      )}
    </>
  ) : null;

  /* Build only the fields that have values — most decision-relevant first
     (deadline, process, who/where), administrative record-keeping last. */
  const metaFields: { label: string; value: React.ReactNode; valueClassName?: string }[] = [
    tender.deadline && { label: "Deadline", value: deadlineValue, valueClassName: deadlineValueClass },
    tender.procurement_type && { label: "Procurement type", value: tender.procurement_type },
    tender.procuring_entity && { label: "Procuring entity", value: tender.procuring_entity },
    tender.country && {
      label: "Country",
      value: <CountryChip country={tender.country} countryIso2={tender.country_iso2} />,
    },
    tender.category && { label: "Category", value: tender.category },
    tender.publication_date && { label: "Published", value: formatDate(tender.publication_date) },
    tender.reference_number && { label: "Reference number", value: tender.reference_number },
    tender.estimated_value_usd && { label: "Estimated value", value: formatCurrency(tender.estimated_value_usd) },
    tender.original_currency && { label: "Currency", value: tender.original_currency },
    tender.participation_fee && {
      label: "Participation fee",
      value: `${tender.participation_fee} ${tender.original_currency}`,
    },
    (tender.location_region || tender.location_district) && {
      label: "Location",
      value: [tender.location_region, tender.location_district].filter(Boolean).join(", "),
    },
    tender.contact_information && { label: "Contact information", value: tender.contact_information },
    tender.lot_count && { label: "Lots", value: tender.lot_count },
    tender.contract_duration_days && {
      label: "Contract duration",
      value: `${tender.contract_duration_days} days`,
    },
  ].filter(Boolean) as { label: string; value: React.ReactNode; valueClassName?: string }[];

  // Free plan sees full detail only once a tender is within the closing
  // window — see src/lib/plan.ts / the settled pricing model. Contact info
  // is the one meta field withheld too, since it's the most actionable bit.
  const gated = !isPro && !isWithinFreeVisibilityWindow(tender.deadline);
  const visibleMetaFields = gated
    ? metaFields.filter((f) => f.label !== "Contact information")
    : metaFields;

  return (
    <div className="space-y-8 pb-2">
      {/* ── Utility row — source link + save, kept quiet and out of the
          way of the title/reading content below ── */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex shrink-0 items-center gap-2">
          {/* Gated the same as the summary/description below — otherwise a
              free user could skip the paywall entirely via the original
              posting. */}
          {!gated && tender.source_url && tender.source !== "tanzania" && (
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
          <Button
            type="button"
            variant={isBookmarked ? "secondary" : "outline"}
            size="sm"
            className="h-8"
            onClick={toggleBookmark}
            disabled={bookmarkBusy}
            aria-pressed={isBookmarked}
          >
            {isBookmarked ? (
              <BookmarkCheck className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Bookmark className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isBookmarked ? "Saved" : "Save"}
          </Button>
        </div>
      </div>

      {/* ── Title + language controls — the headline, sized like something
          you're about to read rather than a UI label ── */}
      <div className="space-y-3">
        <h2
          className={cn(
            "text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-[2.125rem] transition-opacity",
            summaryLoading && "opacity-50"
          )}
        >
          {displayedTitle}
        </h2>
        {summaryLoading && <AIWorkingBadge label="Translating title" />}

        {(showTitleToggle || tender.summary_en) && (
          <div className="flex flex-wrap items-center gap-2">
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

            {/* Drives the AI summary and title together — this is the one
                control for "what language is this tender shown in". */}
            {tender.summary_en && (
              <Select value={summaryLang} onValueChange={setSummaryLang}>
                <SelectTrigger className="h-8 w-[9.5rem] text-xs">
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
            )}
          </div>
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
      </div>

      {/* ── Meta — plain label/value pairs framed by two rules, like a
          procurement notice's front-matter, not a grid of stat tiles ── */}
      {visibleMetaFields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-border/60 py-6 sm:grid-cols-3">
          {visibleMetaFields.map((f, i) => (
            <MetaItem key={i} label={f.label} value={f.value} valueClassName={f.valueClassName} />
          ))}
        </div>
      )}

      {/* ── Body — summary flows straight into description as one
          continuous read instead of stacked, separately-bordered cards ── */}
      {gated ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <Lock className="h-6 w-6 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Full details unlock closer to the deadline
            </p>
            <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
              This tender closes in more than {FREE_VISIBILITY_DAYS} days. Free accounts see full
              detail once it's within that window — Pro sees every tender the moment it's published.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate("/pricing")}>
            Upgrade to Pro
          </Button>
        </div>
      ) : (
        <div className="space-y-7">
          {/* ── Summary ── */}
          {tender.summary_en && (
            <div className="space-y-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                Summary
              </h3>
              {summaryLoading ? (
                <div className="space-y-3">
                  <AIWorkingBadge label="Translating summary" />
                  <div className="space-y-2.5">
                    <div className="h-4 w-full animate-pulse rounded bg-primary/10" />
                    <div className="h-4 w-[85%] animate-pulse rounded bg-primary/10" />
                    <div className="h-4 w-[60%] animate-pulse rounded bg-primary/10" />
                  </div>
                </div>
              ) : (
                <>
                  {summaryError && (
                    <p className="text-[11.5px] font-medium text-amber-600 dark:text-amber-400">
                      {summaryError}
                    </p>
                  )}
                  <p className="text-[17px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {displayedSummary}
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── Description ── */}
          {displayedDescription && (
            <div className="space-y-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                Description
              </h3>

              <div className="relative">
                <div
                  className={cn(
                    "space-y-3",
                    !descExpanded && isLongDescription && "max-h-40 overflow-hidden"
                  )}
                >
                  {descriptionParagraphs.map((paragraph, i) => (
                    <p
                      key={i}
                      className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/80"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
                {!descExpanded && isLongDescription && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
                )}
              </div>

              {isLongDescription && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((e) => !e)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {descExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}
        </div>
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
