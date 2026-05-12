import { ComponentType, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookmarkCheck, BookmarkX, ExternalLink, Clock, Search, Globe, Layers, Circle, ChevronDown, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tender } from "@/lib/types";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";

const PAGE_SIZE = 20;

type FilterOption = {
  value: string;
  label: string;
};

const FilterDropdown = ({
  label,
  value,
  options,
  onChange,
  icon,
  searchable = false,
  disabled = false,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  icon: ComponentType<{ className?: string }>;
  searchable?: boolean;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const Icon = icon;
  const selectedLabel = options.find((option) => option.value === value)?.label ?? label;
  const visibleOptions = searchable
    ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div className="relative min-w-[178px]">
      <button
        type="button"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        className={cn(
          "group flex h-10 w-full items-center justify-between rounded-xl border px-3 transition-all",
          "bg-gradient-to-b from-background to-muted/30 hover:from-muted/40 hover:to-muted/70",
          "border-border/70 shadow-sm hover:border-primary/35",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate text-xs font-medium text-foreground/90">{selectedLabel}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <button
            aria-label="Close filter options"
            type="button"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-[calc(100%+0.4rem)] z-40 w-full overflow-hidden rounded-xl border border-border/80 bg-background shadow-xl">
            {searchable && (
              <div className="border-b border-border/70 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${label.toLowerCase()}...`}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto p-1.5">
              {visibleOptions.length === 0 ? (
                <div className="px-2.5 py-2 text-xs text-muted-foreground">No matches found</div>
              ) : (
                visibleOptions.map((option) => {
                  const selected = option.value === value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        selected ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted"
                      )}
                    >
                      <span className="line-clamp-1">{option.label}</span>
                      {selected ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const getStatusTone = (status: string) => {
  const value = status.toLowerCase();
  if (value.includes("awarded") || value.includes("won") || value.includes("completed")) {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";
  }
  if (value.includes("review") || value.includes("shortlist") || value.includes("progress")) {
    return "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300";
  }
  if (value.includes("draft") || value.includes("new") || value.includes("open")) {
    return "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300";
  }
  if (value.includes("submitted") || value.includes("pending")) {
    return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300";
  }
  if (value.includes("cancel") || value.includes("lost") || value.includes("closed")) {
    return "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300";
  }
  return "bg-muted text-muted-foreground border-border";
};

const TenderStatusBadge = ({ status }: { status: string }) => (
  <span
    className={cn(
      "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
      getStatusTone(status)
    )}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    <span className="truncate">{status}</span>
  </span>
);

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
  <div className="divide-y divide-border/50">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="animate-pulse px-4 py-4 space-y-3">
        <div className="space-y-2">
          <div className="h-3.5 w-4/5 rounded-md bg-muted" />
          <div className="h-3 w-3/5 rounded-md bg-muted/70" />
        </div>
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-muted/60" />
          <div className="h-5 w-20 rounded-full bg-muted/50" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-16 rounded-md bg-muted/50" />
          <div className="h-8 w-20 rounded-md bg-muted/40" />
        </div>
      </div>
    ))}
  </div>
);

/* ── Empty state ─────────────────────────────────────────────────── */
const EmptyState = () => (
  <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
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
  const queryClient = useQueryClient();
  const uid = user?.id ?? getAnonUserId();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<"deadline-asc" | "deadline-desc">("deadline-asc");
  const [page, setPage] = useState(0);

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
        .select("*")
        .in("id", tenderIds)
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

  const countries = useMemo(() => {
    const vals = tenders.map((t) => t.country).filter(Boolean) as string[];
    return ["all", ...Array.from(new Set(vals)).sort()];
  }, [tenders]);

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
      if (country !== "all" && (t.country ?? "") !== country) return false;
      if (category !== "all" && (t.category ?? "") !== category) return false;
      if (status !== "all" && (t.workflow_status ?? "") !== status) return false;
      if (!s) return true;
      const hay = `${t.title ?? ""} ${t.procuring_entity ?? ""} ${t.reference_number ?? ""}`.toLowerCase();
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

  useEffect(() => {
    setPage(0);
  }, [search, country, category, status, sort]);

  const countryOptions: FilterOption[] = countries.map((c) => ({
    value: c,
    label: c === "all" ? "All countries" : c,
  }));
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
    country !== "all" && country,
    category !== "all" && category,
    status !== "all" && status,
  ].filter(Boolean) as string[];

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

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
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        

        <div className="flex flex-wrap gap-2">
          <FilterDropdown
            label="Country"
            value={country}
            options={countryOptions}
            onChange={setCountry}
            icon={Globe}
            searchable
            disabled={loading}
          />
          <FilterDropdown
            label="Category"
            value={category}
            options={categoryOptions}
            onChange={setCategory}
            icon={Layers}
            searchable
            disabled={loading}
          />
          <FilterDropdown
            label="Status"
            value={status}
            options={statusOptions}
            onChange={setStatus}
            icon={Circle}
            disabled={loading}
          />
          <FilterDropdown
            label="Sort"
            value={sort}
            options={sortOptions}
            onChange={(value) => setSort(value as "deadline-asc" | "deadline-desc")}
            icon={Clock}
            disabled={loading}
          />
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {country !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
              {country}
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
      <div className="hidden md:block overflow-hidden bg-background">
        <Table className="z-0 border-separate border-spacing-0">
          <TableHeader className="overflow-hidden bg-muted/35">
            <TableRow>
              <TableHead className="w-11 border-b border-border/70 bg-muted/55 px-3 py-3" />
              <TableHead className="w-[42%] border-b border-border/70 bg-muted/55 px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Tender</TableHead>
              <TableHead className="border-b border-border/70 bg-muted/55 px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Country</TableHead>
              <TableHead className="border-b border-border/70 bg-muted/55 px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Category</TableHead>
              <TableHead className="border-b border-border/70 bg-muted/55 px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Deadline</TableHead>
              <TableHead className="border-b border-border/70 bg-muted/55 px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-0">
                  {sorted.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className="py-14 text-center text-sm text-muted-foreground">
                      No results. Try clearing filters or search.
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((t, idx) => {
                const dueIn = daysUntil(t.deadline);
                return (
                  <TableRow
                    key={t.id}
                    className={cn(
                      "cursor-pointer border-b border-border/80 transition-all hover:bg-muted/45",
                      idx % 2 === 0 ? "bg-muted/30" : "bg-background"
                    )}
                    onClick={() => navigate(`/tender/${t.id}`)}
                  >
                    <TableCell className="relative w-11 px-3 py-3.5 align-middle">
                      <button
                        type="button"
                        onClick={(e) => removeBookmark(t.id, e)}
                        className="relative z-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Remove bookmark"
                      >
                        <BookmarkCheck className="h-4 w-4 text-foreground" />
                      </button>
                    </TableCell>
                    <TableCell className="max-w-[min(48vw,28rem)] py-3.5 pr-4 align-middle lg:max-w-md">
                      <div className="space-y-1">
                        <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2 sm:line-clamp-1">{t.title}</p>
                        {t.procuring_entity && (
                          <p className="text-[12px] text-muted-foreground line-clamp-1">
                            {t.procuring_entity}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3.5 align-middle">
                      <CountryChip country={t.country} />
                    </TableCell>
                    <TableCell className="py-3.5 align-middle">
                      {t.category ? (
                        <span className="inline-flex max-w-full rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] font-semibold leading-none text-muted-foreground overflow-hidden">
                          <span className="truncate max-w-[90px] block">{t.category}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground/35">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-3.5 text-sm">
                      <div className="text-[13px] font-semibold leading-snug text-foreground">{formatDate(t.deadline)}</div>
                      {dueIn != null && (
                        <div className={cn(
                          "text-[10px]",
                          dueIn < 0 ? "text-destructive" : dueIn < 7 ? "text-warning" : "text-muted-foreground"
                        )}>
                          {dueIn < 0 ? `${Math.abs(dueIn)}d ago` : `in ${dueIn}d`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 align-middle">
                      <TenderStatusBadge status={t.workflow_status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Mobile card list (< md) ── */}
      <div className="md:hidden overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        {loading ? (
          <SkeletonCards />
        ) : pageItems.length === 0 ? (
          sorted.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="py-12 px-4 text-center text-sm text-muted-foreground">
              No results. Try clearing filters or search.
            </div>
          )
        ) : (
          <div className="divide-y divide-border/50">
            {pageItems.map((t) => (
              <div
                key={t.id}
                className="px-4 py-4 space-y-3 cursor-pointer active:bg-muted/40 transition-colors"
                onClick={() => navigate(`/tender/${t.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/tender/${t.id}`); }
                }}
              >
                {/* Title + entity */}
                <div className="space-y-1">
                  <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
                    {t.title}
                  </p>
                  {t.procuring_entity && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {t.procuring_entity}
                    </p>
                  )}
                </div>

                {/* Chips: status + deadline + country */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <TenderStatusBadge status={t.workflow_status} />
                  <DeadlinePill deadline={t.deadline} />
                  {t.country && (
                    <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {t.country}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => navigate(`/tender/${t.id}`)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-destructive"
                    onClick={(e) => removeBookmark(t.id, e)}
                  >
                    <BookmarkX className="h-3.5 w-3.5 mr-1.5" />
                    Remove
                  </Button>
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