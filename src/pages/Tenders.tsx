import { ComponentType, Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import { useCountryReference } from "@/hooks/use-country-reference";
import { Tender, WORKFLOW_STATUSES } from "@/lib/types";
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
  DialogFooter,
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
  Circle,
  Calendar,
} from "@/components/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import { handleDbError } from "@/lib/dbError";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
type DeadlineScope = "active" | "past" | "all";

const MotionTableRow = motion(TableRow);

const getTodayIsoDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Stat = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) => (
  <div>
    <div style={{ fontSize: 12, opacity: 0.6 }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, opacity: 0.6 }}>{sub}</div>}
  </div>
);

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
  const [draft, setDraft] = useState(value);
  const Icon = icon;
  const isActive = value !== defaultValue;
  const selectedLabel = options.find((option) => option.value === value)?.label ?? label;
  const visibleOptions = searchable
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(value);
      setQuery("");
    }
    setOpen(next);
  };

  const applyFilter = () => {
    onChange(draft);
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
            const selected = option.value === draft;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => setDraft(option.value)}
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
        <DialogFooter className="border-t border-border/70 p-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={applyFilter}>
            Apply
          </Button>
        </DialogFooter>
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
      <div key={i} className="animate-pulse rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
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
  const [status, setStatus] = useState<string>(() => searchParams.get("status") ?? "all");
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

  const openQuickView = (t: Tender) => {
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
  const closingSoonMaxIso = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + 7);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const sanitizeSearch = (raw: string) => raw.trim().replace(/\s+/g, " ").slice(0, 100);

  const applyCommonFilters = (query: any) => {
    // Africa is the default scope everywhere tenders are listed. NULL
    // continent means the country spelling isn't in country_reference yet —
    // that's a data-quality gap, not an out-of-scope tender, so it stays
    // visible rather than silently disappearing.
    let next = query.eq("enrichment_status", "enriched").or("continent.eq.Africa,continent.is.null");
    const s = sanitizeSearch(debouncedSearch);
    if (s) {
      // Hits the generated search_vector (coalesce(title_en, title) +
      // description + procuring_entity), so an English query still matches
      // tenders published in another language.
      next = next.textSearch("search_vector", s, { config: "simple", type: "websearch" });
    }
    if (country !== "all") next = next.eq("country_iso2", country);
    if (subregion !== "all") next = next.eq("subregion", subregion);
    if (category !== "all") next = next.eq("category", category);
    if (status !== "all") next = next.eq("workflow_status", status);
    if (deadlineScope === "active") next = next.gte("deadline", todayIso);
    if (deadlineScope === "past") next = next.lt("deadline", todayIso);
    return next;
  };

  const tendersQuery = useQuery({
    queryKey: ["tenders-list", page, debouncedSearch, country, subregion, category, status, deadlineScope],
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
    queryKey: ["tenders-facets", debouncedSearch, country, subregion, category, status, deadlineScope],
    queryFn: async () => {
      const s = sanitizeSearch(debouncedSearch);

      let countriesQuery = supabase
        .from("tenders")
        .select("country_iso2")
        .eq("enrichment_status", "enriched")
        .or("continent.eq.Africa,continent.is.null");
      if (s) {
        countriesQuery = countriesQuery.textSearch("search_vector", s, {
          config: "simple",
          type: "websearch",
        });
      }
      if (subregion !== "all") countriesQuery = countriesQuery.eq("subregion", subregion);
      if (category !== "all") countriesQuery = countriesQuery.eq("category", category);
      if (status !== "all") countriesQuery = countriesQuery.eq("workflow_status", status);
      if (deadlineScope === "active") countriesQuery = countriesQuery.gte("deadline", todayIso);
      if (deadlineScope === "past") countriesQuery = countriesQuery.lt("deadline", todayIso);

      let categoriesQuery = supabase
        .from("tenders")
        .select("category")
        .eq("enrichment_status", "enriched")
        .or("continent.eq.Africa,continent.is.null");
      if (s) {
        categoriesQuery = categoriesQuery.textSearch("search_vector", s, {
          config: "simple",
          type: "websearch",
        });
      }
      if (country !== "all") categoriesQuery = categoriesQuery.eq("country_iso2", country);
      if (subregion !== "all") categoriesQuery = categoriesQuery.eq("subregion", subregion);
      if (status !== "all") categoriesQuery = categoriesQuery.eq("workflow_status", status);
      if (deadlineScope === "active") categoriesQuery = categoriesQuery.gte("deadline", todayIso);
      if (deadlineScope === "past") categoriesQuery = categoriesQuery.lt("deadline", todayIso);

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
      const categories = [
        ...new Set((categoriesData ?? []).map((d) => d.category).filter(Boolean) as string[]),
      ].sort();
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
  }, [search, country, subregion, category, status, deadlineScope]);

  // Mirror filters/search/page into the URL so they survive navigating away
  // (e.g. into a tender's detail page) and back.
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.q = debouncedSearch;
    if (country !== "all") params.country = country;
    if (subregion !== "all") params.subregion = subregion;
    if (category !== "all") params.category = category;
    if (status !== "all") params.status = status;
    if (deadlineScope !== "active") params.deadline = deadlineScope;
    if (page > 0) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, country, subregion, category, status, deadlineScope, page, setSearchParams]);

  const statsQuery = useQuery({
    queryKey: ["tenders-stats", debouncedSearch, country, subregion, category, status, deadlineScope],
    queryFn: async () => {
      const totalQuery = applyCommonFilters(
        supabase.from("tenders").select("id", { count: "exact", head: true })
      );
      const closingSoonQuery = applyCommonFilters(
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
      if (error) return toast.error(handleDbError(error));
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

  const activeFilters = [
    country !== "all" && (byIso2.get(country)?.canonical_name ?? country),
    subregion !== "all" && subregion,
    category !== "all" && category,
    status !== "all" && status,
    deadlineScope !== "active" && (deadlineScope === "past" ? "Past deadline" : "All deadlines"),
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

  const statusOptions: FilterOption[] = [
    { value: "all", label: "All statuses" },
    ...WORKFLOW_STATUSES.map((s) => ({ value: s, label: s })),
  ];

  const deadlineOptions: FilterOption[] = [
    { value: "active", label: "Active deadlines" },
    { value: "past", label: "Past deadlines" },
    { value: "all", label: "All deadlines" },
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
        label="Status"
        value={status}
        options={statusOptions}
        onChange={setStatus}
        icon={Circle}
        compact={compact}
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
        <div className="flex items-start justify-between gap-4 flex-wrap">
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
              <Stat label="Saved" value={bookmarks.size} />
            </div>
          </div>
        </div>

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
                  Apply filters
                </Button>
              </SheetContent>
            </Sheet>
          </div>

          {/* Active filter chips */}
          {(country !== "all" || subregion !== "all" || category !== "all" || status !== "all" || deadlineScope !== "active") && (
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
              {status !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                  {status}
                  <button onClick={() => setStatus("all")} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors" aria-label="Remove status filter">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {deadlineScope !== "active" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                  {deadlineScope === "past" ? "Past deadline" : "All deadlines"}
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
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card py-16 px-4 text-center shadow-sm">
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
                />
              ))}
            </div>
          )}

          {/* Mobile Pagination */}
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
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
              user ? "bottom-20 md:bottom-6" : "bottom-6"
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