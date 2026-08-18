import { ComponentType, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookmarkCheck, Clock, Search, Globe, Layers, Circle, ChevronDown, Check, X, SlidersHorizontal } from "@/components/icons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tender } from "@/lib/types";
import { displayTitle, TENDER_LIST_COLUMNS, tenderPath } from "@/lib/tenderLanguage";
import { SourceLanguageBadge, TranslationStatusBadge } from "@/components/tender/LanguageBadges";
import { resolveCountryDisplay } from "@/lib/countries";
import { useCountryReference } from "@/hooks/use-country-reference";
import { getAnonUserId } from "@/lib/anonUser";
import { handleDbError } from "@/lib/dbError";
import { formatDate, daysUntil } from "@/lib/format";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TenderTable } from "@/components/tender/TenderTable";

const PAGE_SIZE = 20;

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
  disabled = false,
}: {
  label: string;
  value: string;
  defaultValue?: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  icon: ComponentType<{ className?: string }>;
  compact?: boolean;
  searchable?: boolean;
  disabled?: boolean;
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
    if (disabled) return;
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
          disabled={disabled}
          className={cn(
            "group flex shrink-0 items-center gap-2.5 transition-colors",
            compact
              ? "h-12 w-full rounded-lg px-3 hover:bg-muted/50"
              : "h-11 px-3.5 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
            disabled && "cursor-not-allowed opacity-50"
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
                "max-w-[8.5rem] truncate text-[13px] font-medium",
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

const CountryChip = ({ country }: { country: string | null | undefined }) => {
  if (!country) {
    return <span className="text-sm text-muted-foreground/35">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 text-[12px] text-muted-foreground">
      <Globe className="h-3 w-3 shrink-0 opacity-70" />
      <span className="line-clamp-1">{country}</span>
    </span>
  );
};

/* ── Deadline pill (reused from Tenders) ────────────────────────── */
const DeadlinePill = ({ deadline }: { deadline: string | null }) => {
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

/* ── Skeleton rows (desktop) ─────────────────────────────────────── */
const SkeletonRows = () => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i} className="animate-pulse hover:bg-transparent">
        <TableCell className="w-11 px-3 py-3">
          <div className="mx-auto h-4 w-4 rounded-md bg-muted" />
        </TableCell>
        <TableCell className="py-3 pr-4">
          <div className="space-y-2">
            <div className="h-3.5 w-4/5 rounded-md bg-muted" />
            <div className="h-3 w-2/5 rounded-md bg-muted/70" />
          </div>
        </TableCell>
        <TableCell className="py-3"><div className="h-6 w-[5.5rem] rounded-full bg-muted/70" /></TableCell>
        <TableCell className="py-3"><div className="h-6 w-[5.5rem] rounded-full bg-muted/60" /></TableCell>
        <TableCell className="py-3"><div className="h-6 w-[4.25rem] rounded-full bg-muted/70" /></TableCell>
        <TableCell className="py-3"><div className="h-6 w-[5.5rem] rounded-full bg-muted/60" /></TableCell>
      </TableRow>
    ))}
  </>
);

/* ── Skeleton cards (mobile) ─────────────────────────────────────── */
const SkeletonCards = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="animate-pulse rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-4/5 rounded-md bg-muted" />
            <div className="h-3 w-3/5 rounded-md bg-muted/70" />
            <div className="flex gap-2 pt-1">
              <div className="h-5 w-16 rounded-full bg-muted/60" />
              <div className="h-5 w-20 rounded-full bg-muted/50" />
            </div>
          </div>
          <div className="h-8 w-8 rounded-md bg-muted shrink-0" />
        </div>
      </div>
    ))}
  </div>
);

/* ── Empty state ─────────────────────────────────────────────────── */
const EmptyState = ({ bordered = false }: { bordered?: boolean }) => (
  <div
    className={cn(
      "flex flex-col items-center gap-3 py-16 px-4 text-center",
      bordered && "rounded-2xl border border-border/70 bg-card shadow-sm"
    )}
  >
    <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
      <BookmarkCheck className="h-6 w-6 text-muted-foreground/60" />
    </div>
    <div>
      <p className="text-sm font-medium text-foreground">No saved tenders yet</p>
      <p className="text-xs text-muted-foreground mt-1">
        Go to Tenders and click the bookmark icon to save opportunities.
      </p>
    </div>
  </div>
);

/* ── Main page ───────────────────────────────────────────────────── */
const Bookmarks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { byIso2 } = useCountryReference();
  const queryClient = useQueryClient();
  const uid = user?.id ?? getAnonUserId();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters/search/page are seeded from the URL and kept in sync with it, so
  // navigating to a tender's detail page and back restores exactly what was
  // set instead of resetting to defaults.
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  // Stores the country_iso2 code (or "all"), not the raw country string.
  const [country, setCountry] = useState(() => searchParams.get("country") ?? "all");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "all");
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "all");
  const [sort, setSort] = useState<"deadline-asc" | "deadline-desc">(
    () => (searchParams.get("sort") as "deadline-asc" | "deadline-desc" | null) ?? "deadline-asc"
  );
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get("page") ?? "0", 10);
    return Number.isFinite(p) && p > 0 ? p : 0;
  });
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Auto-refresh when bookmarks or tenders change in DB.
  useEffect(() => {
    const bookmarksChannel = supabase
      .channel(`rt:bookmarks-page:${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tender_bookmarks",
          filter: `user_id=eq.${uid}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["bookmarks-page", uid] });
          queryClient.invalidateQueries({ queryKey: ["tender-bookmarks", uid] });
        }
      )
      .subscribe();

    const tendersChannel = supabase
      .channel("rt:tenders:bookmarks-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tenders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["bookmarks-page", uid] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(bookmarksChannel);
      void supabase.removeChannel(tendersChannel);
    };
  }, [queryClient, uid]);

  const bookmarksQuery = useQuery({
    queryKey: ["bookmarks-page", uid],
    queryFn: async () => {
      const { data: bookmarks, error: bookmarksError } = await supabase
        .from("tender_bookmarks")
        .select("tender_id")
        .eq("user_id", uid);
      if (bookmarksError) throw new Error(handleDbError(bookmarksError));

      const tenderIds = (bookmarks ?? []).map((b) => b.tender_id);
      if (tenderIds.length === 0) return [] as Tender[];

      const { data: rows, error: tendersError } = await supabase
        .from("tenders")
        .select(TENDER_LIST_COLUMNS)
        .in("id", tenderIds)
        // Africa is the default scope everywhere tenders are listed. NULL
        // continent means an unmapped country spelling, not out-of-scope.
        .or("continent.eq.Africa,continent.is.null")
        .order("deadline", { ascending: true, nullsFirst: false });
      if (tendersError) throw new Error(handleDbError(tendersError));

      return ((rows ?? []) as unknown) as Tender[];
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    // When navigating back to this page, always refetch so users see new bookmarks immediately.
    refetchOnMount: "always",
  });

  const removeBookmark = async (tenderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const { error } = await supabase
      .from("tender_bookmarks")
      .delete()
      .eq("user_id", uid)
      .eq("tender_id", tenderId);

    if (error) { toast.error(handleDbError(error)); return; }

    queryClient.setQueryData(
      ["bookmarks-page", uid],
      (current: Tender[] | undefined) => (current ?? []).filter((t) => t.id !== tenderId)
    );
    queryClient.invalidateQueries({ queryKey: ["tender-bookmarks", uid] });
    toast.success("Removed from bookmarks");
  };

  useEffect(() => {
    if (bookmarksQuery.error instanceof Error) toast.error(bookmarksQuery.error.message);
  }, [bookmarksQuery.error]);

  const tenders = bookmarksQuery.data ?? [];
  const loading = bookmarksQuery.isLoading;

  // Distinct country_iso2 codes present among the bookmarked tenders,
  // labelled with the canonical name from country_reference — not the raw
  // `country` string, which is what makes ESWATINI/SWAZILAND one entry.
  const countryOptions: FilterOption[] = useMemo(() => {
    const isos = new Set(tenders.map((t) => t.country_iso2).filter(Boolean) as string[]);
    return [
      { value: "all", label: "All countries" },
      ...Array.from(isos)
        .map((iso) => ({ value: iso, label: byIso2.get(iso)?.canonical_name ?? iso }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [tenders, byIso2]);

  const statuses = useMemo(() => {
    const vals = tenders.map((t) => t.workflow_status).filter(Boolean) as string[];
    return ["all", ...Array.from(new Set(vals)).sort()];
  }, [tenders]);

  const categories = useMemo(() => {
    const vals = tenders.map((t) => t.category).filter(Boolean) as string[];
    return ["all", ...Array.from(new Set(vals)).sort()];
  }, [tenders]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return tenders.filter((t) => {
      if (country !== "all" && (t.country_iso2 ?? "") !== country) return false;
      if (category !== "all" && (t.category ?? "") !== category) return false;
      if (status !== "all" && (t.workflow_status ?? "") !== status) return false;
      if (!s) return true;
      const hay = `${displayTitle(t)} ${t.procuring_entity ?? ""} ${t.reference_number ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [tenders, search, country, category, status]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    items.sort((a, b) => {
      const ta = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
      return sort === "deadline-asc" ? ta - tb : tb - ta;
    });
    return items;
  }, [filtered, sort]);

  const filtersMounted = useRef(false);
  useEffect(() => {
    if (!filtersMounted.current) {
      filtersMounted.current = true;
      return;
    }
    setPage(0);
  }, [search, country, category, status, sort]);

  // Mirror filters/search/page into the URL so they survive navigating away
  // (e.g. into a tender's detail page) and back.
  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.q = search;
    if (country !== "all") params.country = country;
    if (category !== "all") params.category = category;
    if (status !== "all") params.status = status;
    if (sort !== "deadline-asc") params.sort = sort;
    if (page > 0) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [search, country, category, status, sort, page, setSearchParams]);

  const categoryOptions: FilterOption[] = categories.map((c) => ({
    value: c,
    label: c === "all" ? "All categories" : c,
  }));
  const statusOptions: FilterOption[] = statuses.map((s) => ({
    value: s,
    label: s === "all" ? "All statuses" : s,
  }));
  const sortOptions: FilterOption[] = [
    { value: "deadline-asc", label: "Deadline: soonest" },
    { value: "deadline-desc", label: "Deadline: latest" },
  ];

  const activeFilters = [
    country !== "all" && (byIso2.get(country)?.canonical_name ?? country),
    category !== "all" && category,
    status !== "all" && status,
  ].filter(Boolean) as string[];

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

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
        disabled={loading}
      />
      <FilterDropdown
        label="Category"
        value={category}
        options={categoryOptions}
        onChange={setCategory}
        icon={Layers}
        compact={compact}
        searchable
        disabled={loading}
      />
      <FilterDropdown
        label="Status"
        value={status}
        options={statusOptions}
        onChange={setStatus}
        icon={Circle}
        compact={compact}
        disabled={loading}
      />
      <FilterDropdown
        label="Sort"
        value={sort}
        defaultValue="deadline-asc"
        options={sortOptions}
        onChange={(value) => setSort(value as "deadline-asc" | "deadline-desc")}
        icon={Clock}
        compact={compact}
        disabled={loading}
      />
    </>
  );

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Bookmarks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your saved tenders for quick follow-up.
          </p>
        </div>
        {!loading && sorted.length > 0 && (
          <div className="text-sm text-muted-foreground shrink-0">
            Saved: <span className="font-semibold text-foreground">{sorted.length}</span>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      {/* Desktop */}
      <div className="hidden md:flex items-stretch divide-x divide-border/60 rounded-lg border border-border/70 bg-card shadow-sm overflow-hidden">
        <div className="flex flex-1 min-w-[200px] items-center gap-2.5 px-3.5">
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
            placeholder="Search bookmarks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 border-0 bg-transparent px-0 text-[13px] shadow-none focus-visible:ring-0"
          />
        </div>

        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              disabled={loading}
              className={cn(
                "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-colors",
                activeFilters.length > 0
                  ? "border-primary/50 bg-primary/5 text-primary"
                  : "border-border/70 bg-card text-muted-foreground",
                loading && "cursor-not-allowed opacity-50"
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

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {country !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
              {byIso2.get(country)?.canonical_name ?? country}
              <button onClick={() => setCountry("all")} className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors" aria-label="Remove country filter">
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
        </div>
      )}

      {/* ── Desktop table (md+) ── */}
      <div className="hidden md:block">
        <TenderTable
          tenders={pageItems}
          loading={loading}
          onRowClick={(t) => navigate(tenderPath(t))}
          leadingAction={() => ({ type: "bookmark-remove", isBookmarked: true })}
          onLeadingAction={(t, e) => removeBookmark(t.id, e)}
          emptyState={
            sorted.length === 0 ? <EmptyState /> : (
              <div className="py-14 text-center text-sm text-muted-foreground">
                No results. Try clearing filters or search.
              </div>
            )
          }
        />
      </div>

      {/* ── Mobile card list (< md) ── */}
      <div className="md:hidden">
        {loading ? (
          <SkeletonCards />
        ) : pageItems.length === 0 ? (
          sorted.length === 0 ? (
            <EmptyState bordered />
          ) : (
            <div className="rounded-2xl border border-border/70 bg-card py-12 px-4 text-center text-sm text-muted-foreground shadow-sm">
              No results. Try clearing filters or search.
            </div>
          )
        ) : (
          <div className="space-y-3">
            {pageItems.map((t) => (
              <div
                key={t.id}
                className="relative rounded-2xl border border-border/70 bg-card p-4 shadow-sm cursor-pointer active:bg-muted/30 active:scale-[0.99] transition-all"
                onClick={() => navigate(tenderPath(t))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(tenderPath(t)); }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
                      {displayTitle(t)}
                    </p>
                    {t.procuring_entity && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {t.procuring_entity}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <DeadlinePill deadline={t.deadline} />
                      {resolveCountryDisplay(t.country, t.country_iso2, byIso2).name && (
                        <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                          {resolveCountryDisplay(t.country, t.country_iso2, byIso2).name}
                        </span>
                      )}
                      {t.category && (
                        <span className="inline-flex max-w-[9rem] rounded-full border border-border/70 bg-muted/35 px-2 py-0.5 text-[11px] font-semibold leading-none text-muted-foreground">
                          <span className="truncate">{t.category}</span>
                        </span>
                      )}
                      <SourceLanguageBadge sourceLanguage={t.source_language} />
                      <TranslationStatusBadge status={t.translation_status} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeBookmark(t.id, e); }}
                    className="shrink-0 mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove bookmark"
                  >
                    <BookmarkCheck className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && sorted.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)}
            </span>{" "}
            of <span className="font-medium text-foreground">{sorted.length}</span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Bookmarks;