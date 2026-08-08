import { Tender, WORKFLOW_STATUSES, STATUS_COLORS } from "@/lib/types";
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
  Lock,
} from "@/components/icons";
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
import { User } from "iconoir-react";
import { trackEvent } from "@/lib/analytics";
import { splitIntoParagraphs } from "@/lib/textFormat";

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

const Divider = () => <hr className="border-border/60" />;

// Sidebar hero card — the deadline is the single most decision-relevant
// fact on this page (the product's whole pitch is "never miss one"), so it
// gets its own urgency-colored card instead of living inside the meta grid.
const DeadlineCard = ({ deadline, days }: { deadline: string; days: number | null }) => {
  if (days == null) return null;
  const isOverdue = days < 0;
  const isSoon = days >= 0 && days < 7;
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isOverdue
          ? "border-destructive/30 bg-destructive/5"
          : isSoon
            ? "border-amber-300/60 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10"
            : "border-border bg-card"
      )}
    >
      <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        <Calendar className="h-3 w-3 shrink-0" />
        Deadline
      </span>
      <div
        className={cn(
          "mt-1.5 text-2xl font-semibold tabular-nums leading-none",
          isOverdue
            ? "text-destructive"
            : isSoon
              ? "text-amber-700 dark:text-amber-400"
              : "text-foreground"
        )}
      >
        {isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
      </div>
      <div className="mt-1.5 text-[13px] text-muted-foreground">{formatDate(deadline)}</div>
    </div>
  );
};

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

  // Free plan sees full detail only once a tender is within the closing
  // window — see src/lib/plan.ts / the settled pricing model. Contact info
  // is the one meta field withheld too, since it's the most actionable bit.
  const gated = !isPro && !isWithinFreeVisibilityWindow(tender.deadline);
  const visibleMetaFields = gated
    ? metaFields.filter((f) => f.label !== "Contact information")
    : metaFields;

  return (
    <div className="space-y-6 pb-2">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* top row: identity (status/ref/source/language badges) on the
            left, actions (view source, save) on the right — grouped by
            purpose instead of scattered across three separate rows. */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={updateStatus} disabled={updating}>
              <SelectTrigger
                id="workflow-status"
                className={cn(
                  "h-7 w-auto gap-1 rounded-full border px-2.5 text-[11px] font-medium",
                  STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border"
                )}
              >
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

        {/* title */}
        <h2 className="text-2xl font-semibold leading-snug tracking-tight text-foreground">
          {displayedTitle}
        </h2>

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

            {/* Drives the AI summary and Description together — this is the
                one control for "what language is this tender shown in". */}
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

      <Divider />

      {/* ── Meta grid ────────────────────────────────────────────── */}
      {visibleMetaFields.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          {visibleMetaFields.map((f, i) => (
            <Field key={i} icon={f.icon} label={f.label} value={f.value} />
          ))}
        </div>
      )}

      {gated ? (
        <>
          <Divider />
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
        </>
      ) : (
        <>
          {/* ── AI Summary ───────────────────────────────────────────── */}
          {tender.summary_en && (
            <>
              <Divider />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold tracking-wide text-foreground">
                    AI summary
                  </h3>
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
                        className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground"
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
            </>
          )}
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
