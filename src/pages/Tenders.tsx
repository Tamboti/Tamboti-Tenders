import { ComponentType, Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { useCountryReference } from "@/hooks/use-country-reference";
import { Tender } from "@/lib/types";
import { TENDER_LIST_COLUMNS } from "@/lib/tenderLanguage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditTenderDialog } from "@/components/tender/EditTenderDialog";
import { TenderQuickView } from "@/components/Tenderquickview";
import { TenderTable } from "@/components/tender/TenderTable";
import { TenderCard, DeadlinePill, CountryChip } from "@/components/tender/TenderCard";
import { getAnonUserId } from "@/lib/anonUser";
import { formatDate } from "@/lib/format";
import {
  Search,
  Bookmark,
  BookmarkCheck,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pencil,
  Trash2,
  TrendingUp,
  Globe,
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
  Layers,
  Calendar,
} from "@/components/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { handleDbError } from "@/lib/dbError";
import { isPlanLimitError, isWithinFreeVisibilityWindow, FREE_VISIBILITY_DAYS } from "@/lib/plan";
import { useSubscription } from "@/hooks/use-subscription";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {  AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { Seo } from "@/components/seo/Seo";
import { trackEvent } from "@/lib/analytics";

const PAGE_SIZE = 100;
// "7d" is a closing-soon preset (deadline >= today AND within 7 days) — the
// urgent end. "30d"/"90d" are the opposite: tenders with MORE than that many
// days of runway (deadline > today+N, no upper bound) — for finding tenders
// that aren't closing soon, not a tighter window on top of "active".
type DeadlineScope = "active" | "past" | "all" | "7d" | "30d" | "90d";
const DEADLINE_WINDOW_DAYS: Record<"30d" | "90d", number> = { "30d": 30, "90d": 90 };

const MotionTableRow = motion(TableRow);

const getTodayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDaysIso = (days: number) => {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// websearch_to_tsquery (the previous `type: "websearch"` option) only matches
// whole stemmed words, so "renovat" never matches "renovation". There's no
// "prefix" mode on .textSearch(), so this builds a raw to_tsquery string by
// hand: strip each word to letters/digits (to_tsquery would otherwise choke
// on stray `&`/`|`/`:` etc.) and suffix it with `:*`, Postgres's prefix-match
// operator, ANDing multiple words together like websearch did.
const toPrefixTsQuery = (sanitized: string) =>
  sanitized
    .split(" ")
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");

// The `category` column isn't one clean value per row — some source scrapers
// join multiple categories into a single string, e.g.
// "Corporate Wear,Sports Wear and Equipment". The join delimiter is a comma
// with NO following space; a comma WITH a following space is just normal
// punctuation inside one category's own descriptive name (e.g. "Computers,
// Printers, Photocopiers, Networking Equipment and Accessories" is one
// category). Splitting on that distinction is what turns ~546 raw distinct
// strings into the real ~187 underlying category values.
const splitCategoryValue = (raw: string): string[] =>
  raw
    .split(/,(?=\S)/)
    .map((c) => c.trim())
    .filter(Boolean);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Matches `value` as one whole joined item — at the very start/end of the
// raw string, or between two of the no-space-after commas described above —
// so picking "Corporate Wear" also catches tenders where it's combined with
// other categories, not just the exact standalone string.
const categoryMatchPattern = (value: string) => `(^|,)${escapeRegExp(value)}($|,\\S)`;

const Stat = ({
  label,
  value,
  sub,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  onClick?: () => void;
}) => {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={onClick ? "text-left transition-opacity hover:opacity-70" : undefined}
    >
      <div style={{ fontSize: 12, opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, opacity: 0.6 }}>{sub}</div>}
    </Tag>
  );
};

type FilterOption = {
  value: string;
  label: string;
};

const FilterDropdown = ({
  label,
  value,
  defaultValue = "all",
  options,
  onChange,
  icon,
  compact = false,
  searchable = false,
}: {
  label: string;
  value: string;
  defaultValue?: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  icon: ComponentType<{ className?: string }>;
  compact?: boolean;
  searchable?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const Icon = icon;
  const isActive = value !== defaultValue;
  const selectedLabel = options.find((option) => option.value === value)?.label ?? label;
  const visibleOptions = searchable
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleOpenChange = (next: boolean) => {
    if (next) setQuery("");
    setOpen(next);
  };

  // Picking an option applies it immediately and closes the dropdown — no
  // separate "Apply" click. Client feedback during testing was that the old
  // pick-then-confirm flow felt like the tap hadn't done anything.
  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex shrink-0 items-center gap-2 transition-colors",
            compact
              ? "h-12 w-full rounded-lg px-3 hover:bg-muted/50"
              : "h-11 px-2.5 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
          )}
        >
          <span
            className={cn(
              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground group-hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="flex min-w-0 flex-col items-start leading-tight">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              {label}
            </span>
            <span
              className={cn(
                "max-w-[6rem] truncate text-[13px] font-medium",
                isActive ? "text-foreground" : "text-foreground/80"
              )}
            >
              {selectedLabel}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 p-4 pb-3 text-left">
          <DialogTitle className="text-sm font-semibold">{label}</DialogTitle>
        </DialogHeader>
        {searchable && (
          <div className="border-b border-border/70 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                className="h-9 pl-8 text-sm"
                autoFocus
              />
            </div>
          </div>
        )}
        <div className="max-h-72 overflow-y-auto p-2">
          {visibleOptions.map((option) => {
            const selected = option.value === value;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => selectOption(option.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  selected ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted"
                )}
              >
                <span className="line-clamp-1">{option.label}</span>
                {selected ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5" />}
              </button>
            );
          })}
          {visibleOptions.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matches found</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ── Skeleton rows (desktop) ─────────────────────────────────────── */
const SkeletonTableBody = ({ showAdminCol }: { showAdminCol: boolean }) => (
  <>
    {Array.from({ length: 8 }).map((_, i) => (
      <TableRow key={i} className="animate-pulse border-border/40 hover:bg-transparent">
        <TableCell className="w-11 px-3 py-3">
          <div className="mx-auto h-4 w-4 rounded-md bg-muted" />
        </TableCell>
        <TableCell className="py-3 pr-4">
          <div className="space-y-2">
            <div className="h-3.5 max-w-[min(72%,22rem)] rounded-md bg-muted" />
            <div className="h-3 max-w-[min(48%,14rem)] rounded-md bg-muted/70" />
          </div>
        </TableCell>
        <TableCell className="hidden py-3 sm:table-cell">
          <div className="h-4 max-w-[5rem] rounded-md bg-muted/70" />
        </TableCell>
        <TableCell className="hidden py-3 md:table-cell">
          <div className="h-6 max-w-[7rem] rounded-full bg-muted/60" />
        </TableCell>
        <TableCell className="py-3">
          <div className="h-6 w-[4.25rem] rounded-full bg-muted/70" />
        </TableCell>
        <TableCell className="py-3">
          <div className="h-6 w-[5.5rem] rounded-full bg-muted/60" />
        </TableCell>
        {showAdminCol && (
          <TableCell className="w-11 px-2 py-3">
            <div className="mx-auto h-6 w-6 rounded-md bg-muted/50" />
          </TableCell>
        )}
      </TableRow>
    ))}
  </>
);

/* ── Skeleton cards (mobile) ─────────────────────────────────────── */
const SkeletonCards = () => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="animate-pulse rounded-lg border border-border/70 bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-4/5 rounded-md bg-muted" />
            <div className="h-3 w-3/5 rounded-md bg-muted/70" />
          </div>
          <div className="h-4 w-4 rounded bg-muted shrink-0 mt-0.5" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-muted/60" />
          <div className="h-5 w-20 rounded-full bg-muted/50" />
          <div className="h-5 w-14 rounded-full bg-muted/40" />
        </div>
      </div>
    ))}
  </div>
);

/* ── Main page ───────────────────────────────────────────────────── */
const Tenders = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { isPro } = useSubscription();
  const { byIso2, africaSubregions } = useCountryReference();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Filters/search/page are seeded from the URL and kept in sync with it, so
  // navigating to a tender's detail page and back restores exactly what was
  // set instead of resetting to defaults.
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get("page") ?? "0", 10);
    return Number.isFinite(p) && p > 0 ? p : 0;
  });
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("q") ?? "");
  // Stores the country_iso2 code (or "all"), not the raw country string —
  // that's what makes ESWATINI/SWAZILAND behave as one country.
  const [country, setCountry] = useState<string>(() => searchParams.get("country") ?? "all");
  const [subregion, setSubregion] = useState<string>(() => searchParams.get("subregion") ?? "all");
  const [category, setCategory] = useState<string>(() => searchParams.get("category") ?? "all");
  const [deadlineScope, setDeadlineScope] = useState<DeadlineScope>(
    () => (searchParams.get("deadline") as DeadlineScope | null) ?? "active"
  );
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [editing, setEditing] = useState<Tender | null>(null);
  const [deleting, setDeleting] = useState<Tender | null>(null);

  // Quick view state
  const [quickViewTender, setQuickViewTender] = useState<Tender | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  // Scroll-to-top / scroll-to-bottom button: only one shows at a time,
  // depending on how far down the list the user has scrolled.
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [scrollButton, setScrollButton] = useState<"top" | "bottom" | null>(null);

  useEffect(() => {
    const scrollEl = pageRef.current?.closest<HTMLElement>(".overflow-y-auto");
    const target: HTMLElement | Window = scrollEl ?? window;
    const handleScroll = () => {
      const top = scrollEl ? scrollEl.scrollTop : window.scrollY;
      const clientHeight = scrollEl ? scrollEl.clientHeight : window.innerHeight;
      const scrollHeight = scrollEl ? scrollEl.scrollHeight : document.documentElement.scrollHeight;
      const distanceFromBottom = scrollHeight - (top + clientHeight);

      if (scrollHeight <= clientHeight + 200) {
        setScrollButton(null);
      } else if (top > 600) {
        setScrollButton("top");
      } else if (distanceFromBottom > 400) {
        setScrollButton("bottom");
      } else {
        setScrollButton(null);
      }
    };

    handleScroll();
    target.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    // Recompute when list content loads/changes and resizes the scroll container.
    let observer: ResizeObserver | undefined;
    if (scrollEl && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(handleScroll);
      observer.observe(scrollEl);
    }

    return () => {
      target.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      observer?.disconnect();
    };
  }, []);

  const scrollToTop = () => {
    const scrollEl = pageRef.current?.closest<HTMLElement>(".overflow-y-auto");
    if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    const scrollEl = pageRef.current?.closest<HTMLElement>(".overflow-y-auto");
    if (scrollEl) scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: "smooth" });
    else window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  const uid = user?.id ?? getAnonUserId();

  // Anyone can browse/filter every tender, but only a signed-in account
  // within the free visibility window (or Pro, any time) can open the
  // quick view — it surfaces summary/detail TenderDetail.tsx would
  // otherwise gate behind the same paywall, so it needs the same rule.
  const openQuickView = (t: Tender) => {
    if (isPro) {
      setQuickViewTender(t);
      setQuickViewOpen(true);
      return;
    }
    if (!user) {
      toast.error("Sign in to view tender details.", {
        action: { label: "Sign up", onClick: () => navigate("/login?mode=signup") },
      });
      return;
    }
    if (!isWithinFreeVisibilityWindow(t.deadline)) {
      toast.error(
        `This tender closes in more than ${FREE_VISIBILITY_DAYS} days - upgrade to Pro to view it now.`,
        { action: { label: "Upgrade", onClick: () => navigate("/pricing") } }
      );
      return;
    }
    setQuickViewTender(t);
    setQuickViewOpen(true);
  };

  useEffect(() => {
    const tendersChannel = supabase
      .channel("rt:tenders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tenders",
          filter: "enrichment_status=eq.enriched",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tenders-list"] });
          queryClient.invalidateQueries({ queryKey: ["tenders-facets"] });
        }
      )
      .subscribe();

    const bookmarksChannel = supabase
      .channel(`rt:tender_bookmarks:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tender_bookmarks",
          filter: `user_id=eq.${uid}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tender-bookmarks", uid] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(tendersChannel);
      void supabase.removeChannel(bookmarksChannel);
    };
  }, [queryClient, uid]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const closingSoonMaxIso = useMemo(() => addDaysIso(7), []);

  const sanitizeSearch = (raw: string) => raw.trim().replace(/\s+/g, " ").slice(0, 100);

  // Shared by applyCommonFilters and the facets query below, so the two
  // "7d"/"30d"/"90d" windows can't drift out of sync between them.
  const applyDeadlineScope = (query: any, scope: DeadlineScope) => {
    if (scope === "active") return query.gte("deadline", todayIso);
    if (scope === "past") return query.lt("deadline", todayIso);
    if (scope === "all") return query;
    if (scope === "7d") return query.gte("deadline", todayIso).lte("deadline", addDaysIso(7));
    // "30d"/"90d" — tenders with more than that many days of runway before
    // their deadline, i.e. NOT closing soon. Strictly beyond the window, no
    // upper bound (see the DeadlineScope comment above).
    return query.gt("deadline", addDaysIso(DEADLINE_WINDOW_DAYS[scope]));
  };

  // Every filter except the deadline scope — split out so the "Closing
  // soon" stat (a fixed 7-day window) can reuse search/country/etc without
  // also going through applyDeadlineScope, which would otherwise stack a
  // second, redundant deadline range on top of its own.
  const applyBaseFilters = (query: any) => {
    // Africa is the default scope everywhere tenders are listed. NULL
    // continent means the country spelling isn't in country_reference yet —
    // that's a data-quality gap, not an out-of-scope tender, so it stays
    // visible rather than silently disappearing.
    let next = query.eq("enrichment_status", "enriched").or("continent.eq.Africa,continent.is.null");
    const s = sanitizeSearch(debouncedSearch);
    const tsQuery = s ? toPrefixTsQuery(s) : "";
    if (tsQuery) {
      // Hits the generated search_vector (coalesce(title_en, title) +
      // description + procuring_entity), so an English query still matches
      // tenders published in another language.
      next = next.textSearch("search_vector", tsQuery, { config: "simple" });
    }
    if (country !== "all") next = next.eq("country_iso2", country);
    if (subregion !== "all") next = next.eq("subregion", subregion);
    if (category !== "all") next = next.regexIMatch("category", categoryMatchPattern(category));
    return next;
  };

  const applyCommonFilters = (query: any) => applyDeadlineScope(applyBaseFilters(query), deadlineScope);

  const tendersQuery = useQuery({
    queryKey: ["tenders-list", page, debouncedSearch, country, subregion, category, deadlineScope],
    queryFn: async () => {
      let query = applyCommonFilters(
        supabase
        .from("tenders")
        .select(TENDER_LIST_COLUMNS, { count: "exact" })
        .order("deadline", { ascending: true, nullsFirst: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      );

      const { data, error, count } = await query;
      if (error) throw new Error(handleDbError(error));
      return { items: (data as Tender[]) ?? [], total: count ?? 0 };
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const facetsQuery = useQuery({
    queryKey: ["tenders-facets", debouncedSearch, country, subregion, category, deadlineScope],
    queryFn: async () => {
      const s = sanitizeSearch(debouncedSearch);
      const tsQuery = s ? toPrefixTsQuery(s) : "";

      let countriesQuery = supabase
        .from("tenders")
        .select("country_iso2")
        .eq("enrichment_status", "enriched")
        .or("continent.eq.Africa,continent.is.null");
      if (tsQuery) {
        countriesQuery = countriesQuery.textSearch("search_vector", tsQuery, {
          config: "simple",
        });
      }
      if (subregion !== "all") countriesQuery = countriesQuery.eq("subregion", subregion);
      if (category !== "all") countriesQuery = countriesQuery.regexIMatch("category", categoryMatchPattern(category));
      countriesQuery = applyDeadlineScope(countriesQuery, deadlineScope);

      let categoriesQuery = supabase
        .from("tenders")
        .select("category")
        .eq("enrichment_status", "enriched")
        .or("continent.eq.Africa,continent.is.null");
      if (tsQuery) {
        categoriesQuery = categoriesQuery.textSearch("search_vector", tsQuery, {
          config: "simple",
        });
      }
      if (country !== "all") categoriesQuery = categoriesQuery.eq("country_iso2", country);
      if (subregion !== "all") categoriesQuery = categoriesQuery.eq("subregion", subregion);
      categoriesQuery = applyDeadlineScope(categoriesQuery, deadlineScope);

      const [
        { data: countriesData, error: countriesError },
        { data: categoriesData, error: categoriesError },
      ] = await Promise.all([countriesQuery, categoriesQuery]);

      if (countriesError) throw new Error(handleDbError(countriesError));
      if (categoriesError) throw new Error(handleDbError(categoriesError));

      // Intersected with what actually appears in tenders — names are
      // resolved against country_reference at render time (see
      // countryOptions below), not here, so they stay in sync once that
      // reference data has loaded.
      const countryIsos = [
        ...new Set((countriesData ?? []).map((d) => d.country_iso2).filter(Boolean) as string[]),
      ];
      // Raw category strings can bundle several categories together (see
      // splitCategoryValue) — split each apart before deduping, otherwise
      // every distinct combination shows up as its own filter option.
      const categorySeen = new Map<string, string>(); // lowercase -> display casing
      for (const row of categoriesData ?? []) {
        if (!row.category) continue;
        for (const c of splitCategoryValue(row.category)) {
          const key = c.toLowerCase();
          if (!categorySeen.has(key)) categorySeen.set(key, c);
        }
      }
      const categories = Array.from(categorySeen.values()).sort((a, b) => a.localeCompare(b));
      return { countryIsos, categories };
    },
    staleTime: 15 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const bookmarksQuery = useQuery({
    queryKey: ["tender-bookmarks", uid],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tender_bookmarks")
        .select("tender_id")
        .eq("user_id", uid);
      if (error) throw new Error(handleDbError(error));
      return new Set((data ?? []).map((d) => d.tender_id));
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (bookmarksQuery.data) setBookmarks(bookmarksQuery.data);
  }, [bookmarksQuery.data]);

  useEffect(() => {
    if (tendersQuery.error instanceof Error) toast.error(tendersQuery.error.message);
  }, [tendersQuery.error]);

  useEffect(() => {
    if (facetsQuery.error instanceof Error) toast.error(facetsQuery.error.message);
  }, [facetsQuery.error]);

  useEffect(() => {
    if (bookmarksQuery.error instanceof Error) toast.error(bookmarksQuery.error.message);
  }, [bookmarksQuery.error]);

  const filtersMounted = useRef(false);
  useEffect(() => {
    if (!filtersMounted.current) {
      filtersMounted.current = true;
      return;
    }
    setPage(0);
  }, [search, country, subregion, category, deadlineScope]);

  // Mirror filters/search/page into the URL so they survive navigating away
  // (e.g. into a tender's detail page) and back.
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.q = debouncedSearch;
    if (country !== "all") params.country = country;
    if (subregion !== "all") params.subregion = subregion;
    if (category !== "all") params.category = category;
    if (deadlineScope !== "active") params.deadline = deadlineScope;
    if (page > 0) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, country, subregion, category, deadlineScope, page, setSearchParams]);

  const statsQuery = useQuery({
    queryKey: ["tenders-stats", debouncedSearch, country, subregion, category, deadlineScope],
    queryFn: async () => {
      const totalQuery = applyCommonFilters(
        supabase.from("tenders").select("id", { count: "exact", head: true })
      );
      // Deliberately not routed through applyCommonFilters/applyDeadlineScope
      // — "Closing soon" is always a fixed 7-day window regardless of which
      // deadline scope the user has selected in the filter bar.
      const closingSoonQuery = applyBaseFilters(
        supabase
          .from("tenders")
          .select("id", { count: "exact", head: true })
          .gte("deadline", todayIso)
          .lte("deadline", closingSoonMaxIso)
      );

      const [{ count: totalCount, error: totalError }, { count: soonCount, error: soonError }] =
        await Promise.all([totalQuery, closingSoonQuery]);

      if (totalError) throw new Error(handleDbError(totalError));
      if (soonError) throw new Error(handleDbError(soonError));

      return {
        total: totalCount ?? 0,
        closingSoon: soonCount ?? 0,
      };
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const toggleBookmark = async (tenderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) {
      toast.error("Sign in to save tenders");
      return;
    }
    const has = bookmarks.has(tenderId);
    if (has) {
      const { error } = await supabase
        .from("tender_bookmarks").delete().eq("user_id", uid).eq("tender_id", tenderId);
      if (error) return toast.error(handleDbError(error));
      setBookmarks((b) => {
        const n = new Set(b);
        n.delete(tenderId);
        queryClient.setQueryData(["tender-bookmarks", uid], n);
        return n;
      });
      queryClient.invalidateQueries({ queryKey: ["bookmarks-page", uid] });
      trackEvent("bookmark_toggle", { action: "remove", tender_id: tenderId });
    } else {
      const { error } = await supabase
        .from("tender_bookmarks").insert({ user_id: uid, tender_id: tenderId });
      if (error) {
        if (isPlanLimitError(error)) {
          toast.error("Free plan limit reached - up to 5 bookmarks. Upgrade to Pro for unlimited.", {
            action: { label: "Upgrade", onClick: () => navigate("/pricing") },
          });
          return;
        }
        return toast.error(handleDbError(error));
      }
      setBookmarks((b) => {
        const n = new Set(b).add(tenderId);
        queryClient.setQueryData(["tender-bookmarks", uid], n);
        return n;
      });
      queryClient.invalidateQueries({ queryKey: ["bookmarks-page", uid] });
      trackEvent("bookmark_toggle", { action: "add", tender_id: tenderId });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("tenders").delete().eq("id", deleting.id);
    if (error) { toast.error(handleDbError(error)); return; }
    toast.success("Tender deleted");
    setDeleting(null);
    queryClient.invalidateQueries({ queryKey: ["tenders-list"] });
  };

  const tenders = tendersQuery.data?.items ?? [];
  const total = tendersQuery.data?.total ?? 0;
  const categories = facetsQuery.data?.categories ?? [];
  const loading = tendersQuery.isLoading;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statsTotal = statsQuery.data?.total ?? total;
  const urgentCount = statsQuery.data?.closingSoon ?? 0;

  const deadlineOptions: FilterOption[] = [
    { value: "active", label: "Active deadlines" },
    { value: "7d", label: "Closing within 7 days" },
    { value: "30d", label: "More than 30 days out" },
    { value: "90d", label: "More than 90 days out" },
    { value: "past", label: "Past deadlines" },
    { value: "all", label: "All deadlines" },
  ];
  const deadlineScopeLabel = (scope: DeadlineScope) =>
    deadlineOptions.find((o) => o.value === scope)?.label ?? scope;

  const activeFilters = [
    country !== "all" && (byIso2.get(country)?.canonical_name ?? country),
    subregion !== "all" && subregion,
    category !== "all" && category,
    deadlineScope !== "active" && deadlineScopeLabel(deadlineScope),
  ].filter(Boolean) as string[];

  const countryOptions: FilterOption[] = useMemo(
    () => [
      { value: "all", label: "All countries" },
      ...(facetsQuery.data?.countryIsos ?? [])
        .map((iso) => ({ value: iso, label: byIso2.get(iso)?.canonical_name ?? iso }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [facetsQuery.data, byIso2]
  );

  const subregionOptions: FilterOption[] = [
    { value: "all", label: "All subregions" },
    ...africaSubregions.map((sr) => ({ value: sr, label: sr })),
  ];

  const categoryOptions: FilterOption[] = [
    { value: "all", label: "All categories" },
    ...categories.map((c) => ({ value: c, label: c })),
  ];

  /* ── Shared filter controls ── */
  const FilterControls = ({ compact = false }: { compact?: boolean }) => (
    <>
      <FilterDropdown
        label="Country"
        value={country}
        options={countryOptions}
        onChange={setCountry}
        icon={Globe}
        compact={compact}
        searchable
      />
      <FilterDropdown
        label="Subregion"
        value={subregion}
        options={subregionOptions}
        onChange={setSubregion}
        icon={Globe}
        compact={compact}
      />
      <FilterDropdown
        label="Category"
        value={category}
        options={categoryOptions}
        onChange={setCategory}
        icon={Layers}
        compact={compact}
        searchable
      />
      <FilterDropdown
        label="Deadline"
        value={deadlineScope}
        defaultValue="active"
        options={deadlineOptions}
        onChange={(value) => setDeadlineScope(value as DeadlineScope)}
        icon={Calendar}
        compact={compact}
      />
    </>
  );

  return (
    <div ref={pageRef} className="w-full min-h-0">
      <Seo
        title="Browse Tenders"
        description="Search and filter procurement tenders across Africa by country, category, and deadline."
        url={typeof window !== "undefined" ? window.location.origin + "/tenders" : undefined}
      />
      <PageContainer className="space-y-6 sm:space-y-8">

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start justify-between gap-4 flex-wrap"
        >
          <div className="space-y-1">
            <h1 className="page-title">Tenders</h1>
            <p className="text-sm text-muted-foreground">
              Browse and triage live procurement opportunities.
            </p>
          </div>

          <div className="flex items-center gap-5 sm:gap-6 overflow-x-auto pb-0.5 scrollbar-none">
            <Stat label="Total" value={statsTotal.toLocaleString()} />
            <div className="pl-5 sm:pl-8">
              <Stat label="Closing soon" value={urgentCount} />
            </div>
            <div className="pl-5 sm:pl-8">
              <Stat label="Saved" value={bookmarks.size} onClick={() => navigate("/portal/bookmarks")} />
            </div>
          </div>
        </motion.div>

        {/* ── Filters ── */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-background/85 backdrop-blur-md">
          {/* Desktop */}
          <div className="hidden md:flex items-stretch divide-x divide-border/60 rounded-lg border border-border/70 bg-card shadow-sm overflow-x-auto scrollbar-none">
            <div className="flex flex-1 min-w-[140px] items-center gap-2.5 px-3.5">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </span>
              <Input
                placeholder="Search title, reference…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
              />
            </div>
            <FilterControls />
          </div>

          {/* Mobile */}
          <div className="flex md:hidden gap-2 items-stretch">
            <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3.5 shadow-sm">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </span>
              <Input
                placeholder="Search tenders…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
              />
            </div>

            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "relative flex h-11 bg-primary w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-colors",
                    activeFilters.length > 0
                      ? "border-primary/50 bg-primary/5 text-primary"
                      : "border-border/70 bg-primary text-white"
                  )}
                  aria-label="Open filters"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeFilters.length > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {activeFilters.length}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-5">
                <SheetHeader className="mb-4">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-base font-semibold">Filters</SheetTitle>
                  </div>
                </SheetHeader>
                <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card">
                  <FilterControls compact />
                </div>
                <Button className="mt-6 w-full" onClick={() => setFilterSheetOpen(false)}>
                  Done
                </Button>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active filter chips */}
          {(country !== "all" || subregion !== "all" || category !== "all" || deadlineScope !== "active") && (
            <div className="flex gap-2 flex-wrap mt-3">
              {country !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                  {byIso2.get(country)?.canonical_name ?? country}
                  <button onClick={() => setCountry("all")} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors" aria-label="Remove country filter">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {subregion !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                  {subregion}
                  <button onClick={() => setSubregion("all")} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors" aria-label="Remove subregion filter">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {category !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                  {category}
                  <button onClick={() => setCategory("all")} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors" aria-label="Remove category filter">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {deadlineScope !== "active" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                  {deadlineScopeLabel(deadlineScope)}
                  <button onClick={() => setDeadlineScope("active")} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors" aria-label="Remove deadline filter">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Desktop table (md+) ── */}
        <div className="hidden md:block">
          <TenderTable
            tenders={tenders}
            loading={loading}
            isSelected={(t) => quickViewTender?.id === t.id && quickViewOpen}
            onRowClick={(t) => openQuickView(t)}
            leadingAction={(t) => ({ type: "bookmark-toggle", isBookmarked: bookmarks.has(t.id) })}
            onLeadingAction={(t, e) => toggleBookmark(t.id, e)}
            showActions={isAdmin}
            onEdit={setEditing}
            onDelete={setDeleting}
            emptyState={
              <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
                  <TrendingUp className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No tenders found</p>
                  <p className="mx-auto max-w-xs text-xs text-muted-foreground">
                    Try adjusting your search or filters to find what you're looking for.
                  </p>
                </div>
              </div>
            }
          />

          {/* Desktop Pagination */}
          <div className="flex items-center justify-between px-1 pt-4">
            <span className="text-xs text-muted-foreground tabular-nums">
              {total === 0
                ? "No results"
                : `${(page * PAGE_SIZE + 1).toLocaleString()}–${Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()} of ${total.toLocaleString()}`}
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-1 tabular-nums">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Mobile card list (< md) ── */}
        <div className="md:hidden">
          {loading ? (
            <SkeletonCards />
          ) : tenders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border/70 bg-card py-16 px-4 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
                <TrendingUp className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">No tenders found</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Try adjusting your search or filters to find what you're looking for.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {tenders.map((t, idx) => (
                <TenderCard
                  key={t.id}
                  t={t}
                  idx={idx}
                  onClick={() => openQuickView(t)}
                  isBookmarked={bookmarks.has(t.id)}
                  onToggleBookmark={(e) => toggleBookmark(t.id, e)}
                />
              ))}
            </div>
          )}

          {/* Mobile Pagination */}
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border/70 bg-card px-4 py-3 shadow-sm">
            <span className="text-xs text-muted-foreground tabular-nums">
              {total === 0
                ? "No results"
                : `${(page * PAGE_SIZE + 1).toLocaleString()}–${Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()} of ${total.toLocaleString()}`}
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-1 tabular-nums">{page + 1} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= totalPages}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

      </PageContainer>

      {/* ── Quick view panel ── */}
      <TenderQuickView
        tender={quickViewTender}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        onTenderChanged={() => queryClient.invalidateQueries({ queryKey: ["tenders-list"] })}
      />

      {/* ── Edit dialog ── */}
      <EditTenderDialog
        tender={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["tenders-list"] })}
      />

      {/* ── Delete dialog ── */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tender?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Scroll to top / bottom ── */}
      {scrollButton &&
        createPortal(
          <button
            type="button"
            onClick={scrollButton === "top" ? scrollToTop : scrollToBottom}
            className={cn(
              "fixed right-6 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-primary text-white shadow-lg transition-all hover:bg-primary/40 active:scale-95",
              // Both shells now have a mobile-only bottom nav (PublicBottomNav
              // on the public shell, PortalBottomNav on AppLayout) that this
              // button needs to clear; neither has one on desktop.
              "bottom-20 md:bottom-6"
            )}
            aria-label={scrollButton === "top" ? "Back to top" : "Scroll to bottom"}
          >
            {scrollButton === "top" ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>,
          document.body
        )}
    </div>
  );
};

export default Tenders;