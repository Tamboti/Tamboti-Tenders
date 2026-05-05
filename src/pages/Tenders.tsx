import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tender, WORKFLOW_STATUSES } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StatusBadge } from "@/components/StatusBadge";
import { EditTenderDialog } from "@/components/tender/EditTenderDialog";
import { getAnonUserId } from "@/lib/anonUser";
import { formatDate, daysUntil } from "@/lib/format";
import {
  Search,
  Bookmark,
  BookmarkCheck,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  TrendingUp,
  Clock,
  Globe,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const PAGE_SIZE = 50;

const MotionTableRow = motion(TableRow);

/* ── Deadline pill ───────────────────────────────────────────────── */
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
  <div className="divide-y divide-border/50">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="animate-pulse px-4 py-4 space-y-3">
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

/* ── Mobile tender card ──────────────────────────────────────────── */
const TenderCard = ({
  t,
  isBookmarked,
  isAdmin,
  onBookmark,
  onEdit,
  onDelete,
  onClick,
  idx,
}: {
  t: Tender;
  isBookmarked: boolean;
  isAdmin: boolean;
  onBookmark: (id: string, e: React.MouseEvent) => void;
  onEdit: (t: Tender) => void;
  onDelete: (t: Tender) => void;
  onClick: () => void;
  idx: number;
}) => {
  const dDays = daysUntil(t.deadline);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.25) }}
      className="relative  py-4 cursor-pointer active:bg-muted/40 transition-colors border-b border-border/50 last:border-0"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
      }}
    >
      {/* accent line */}
      <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-primary/0 transition-colors" />

      <div className="flex items-start gap-3">
        {/* bookmark */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onBookmark(t.id, e); }}
          className="shrink-0 mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label={isBookmarked ? "Remove bookmark" : "Save tender"}
        >
          {isBookmarked ? (
            <BookmarkCheck className="h-4 w-4 text-foreground" />
          ) : (
            <Bookmark className="h-4 w-4 opacity-50" />
          )}
        </button>

        {/* content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
            {t.title}
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

          {/* chips row */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <StatusBadge status={t.workflow_status} />

            {/* deadline */}
            <DeadlinePill deadline={t.deadline} />

            {/* country */}
            {t.country && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                <Globe className="h-2.5 w-2.5 shrink-0" />
                {t.country}
              </span>
            )}

            {/* category */}
            {t.category && (
              <span className="inline-flex max-w-[9rem] rounded-lg border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] font-medium leading-none text-muted-foreground">
                <span className="truncate">{t.category}</span>
              </span>
            )}
          </div>

          {/* summary */}
          {t.summary_en && (
            <p className="text-[11px] text-muted-foreground/75 line-clamp-2 mt-1">
              {t.summary_en}
            </p>
          )}
        </div>

        {/* admin actions */}
        {isAdmin && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Tender actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-sm">
                <DropdownMenuItem onClick={() => onEdit(t)}>
                  <Pencil className="mr-2 h-3 w-3" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(t)}>
                  <Trash2 className="mr-2 h-3 w-3" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ── Main page ───────────────────────────────────────────────────── */
const Tenders = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [country, setCountry] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [editing, setEditing] = useState<Tender | null>(null);
  const [deleting, setDeleting] = useState<Tender | null>(null);

  const isAdmin = role === "admin";
  const uid = user?.id ?? getAnonUserId();

  // Keep cached lists fresh when the DB changes (no manual refresh).
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

  const tendersQuery = useQuery({
    queryKey: ["tenders-list", page, debouncedSearch, country, category, status],
    queryFn: async () => {
      let query = supabase
        .from("tenders")
        .select("*", { count: "exact" })
        .order("deadline", { ascending: true, nullsFirst: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
        .eq("enrichment_status", "enriched");

      if (debouncedSearch.trim()) {
        const s = debouncedSearch.trim().replace(/,/g, " ");
        query = query.or(
          `title.ilike.%${s}%,procuring_entity.ilike.%${s}%,reference_number.ilike.%${s}%`
        );
      }
      if (country !== "all") query = query.eq("country", country);
      if (category !== "all") query = query.eq("category", category);
      if (status !== "all") query = query.eq("workflow_status", status);

      const { data, error, count } = await query;
      if (error) throw new Error(handleDbError(error));
      return { items: (data as Tender[]) ?? [], total: count ?? 0 };
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const facetsQuery = useQuery({
    queryKey: ["tenders-facets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenders")
        .select("country, category")
        .limit(1000);
      if (error) throw new Error(handleDbError(error));
      const countries = [...new Set(data.map((d) => d.country).filter(Boolean) as string[])].sort();
      const categories = [...new Set(data.map((d) => d.category).filter(Boolean) as string[])].sort();
      return { countries, categories };
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

  useEffect(() => { setPage(0); }, [search, country, category, status]);

  const toggleBookmark = async (tenderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
      // Ensure Bookmarks page refreshes even within staleTime.
      queryClient.invalidateQueries({ queryKey: ["bookmarks-page", uid] });
    } else {
      const { error } = await supabase
        .from("tender_bookmarks").insert({ user_id: uid, tender_id: tenderId });
      if (error) return toast.error(handleDbError(error));
      setBookmarks((b) => {
        const n = new Set(b).add(tenderId);
        queryClient.setQueryData(["tender-bookmarks", uid], n);
        return n;
      });
      // Ensure Bookmarks page refreshes even within staleTime.
      queryClient.invalidateQueries({ queryKey: ["bookmarks-page", uid] });
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
  const countries = facetsQuery.data?.countries ?? [];
  const categories = facetsQuery.data?.categories ?? [];
  const loading = tendersQuery.isLoading;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const urgentCount = useMemo(
    () => tenders.filter((t) => { const d = daysUntil(t.deadline); return d != null && d >= 0 && d <= 7; }).length,
    [tenders]
  );

  const activeFilters = [
    country !== "all" && country,
    category !== "all" && category,
    status !== "all" && status,
  ].filter(Boolean) as string[];

  const clearAllFilters = () => {
    setCountry("all");
    setCategory("all");
    setStatus("all");
  };

  /* ── Shared filter controls (used in both bar and sheet) ── */
  const FilterControls = ({ compact = false }: { compact?: boolean }) => (
    <>
      <Select value={country} onValueChange={setCountry}>
        <SelectTrigger className={cn("text-sm shadow-sm rounded-lg border border-border", compact ? "h-10 w-full" : "w-[148px] h-9")}>
          <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
          <SelectValue placeholder="Country" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All countries</SelectItem>
          {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className={cn("text-sm shadow-sm rounded-lg border border-border", compact ? "h-10 w-full" : "w-[168px] h-9")}>
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className={cn("text-sm shadow-sm rounded-lg border border-border", compact ? "h-10 w-full" : "w-[148px] h-9")}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {WORKFLOW_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="w-full min-h-0">
      <PageContainer className="space-y-6 sm:space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="page-title">Tenders</h1>
            <p className="text-sm text-muted-foreground">
              Browse and triage live procurement opportunities.
            </p>
          </div>

          {/* Stats — horizontal scroll on very small screens */}
          <div className="flex items-center gap-5 sm:gap-6 overflow-x-auto pb-0.5 scrollbar-none">
            <Stat label="Total" value={total.toLocaleString()} />
            <div className="pl-5 sm:pl-8 ">
              <Stat label="Closing soon" value={urgentCount} />
            </div>
            <div className="pl-5 sm:pl-8">
              <Stat label="Saved" value={bookmarks.size} />
            </div>
          </div>
        </div>

        {/* ── Filters (sticky layer) ── */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-background/85 backdrop-blur-md border-y border-border/60">
          {/* Desktop filter bar (md+) */}
          <div className="hidden md:flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[260px] rounded-lg border border-border bg-background">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search title, entity, reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm bg-transparent"
            />
          </div>
          <FilterControls />
          {activeFilters.length > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Mobile filter bar (< md): search + filter button */}
        <div className="flex md:hidden gap-2 items-center">
          <div className="relative flex-1 rounded-lg border border-border bg-background">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tenders…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-10 text-sm bg-transparent"
            />
          </div>

          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-10 gap-2 rounded-lg border border-border text-sm shrink-0",
                  activeFilters.length > 0 && "border-primary/60 text-primary bg-primary/5"
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilters.length > 0 && (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilters.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-5">
              <SheetHeader className="mb-5">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-base font-semibold">Filters</SheetTitle>
                  {activeFilters.length > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </SheetHeader>
              <div className="space-y-3">
                <FilterControls compact />
              </div>
              <Button
                className="mt-6 w-full"
                onClick={() => setFilterSheetOpen(false)}
              >
                Show results
              </Button>
            </SheetContent>
          </Sheet>
        </div>

        {/* ── Active filter chips (shared) ── */}
        {activeFilters.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3">
            {activeFilters.map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
                {f}
              </span>
            ))}
          </div>
        )}
        </div>

        {/* ── Desktop table (md+) ── */}
        <div className="hidden md:block overflow-hidden shadow-sm rounded-lg border border-border ring-1 ring-border/60 dark:ring-border">
          <Table className="border-separate z-0 border-spacing-0 [&_tr]:border-border/55">
            <TableHeader className="[&_tr]:border-b [&_tr]:border-border/70 overflow-hidden">
              <TableRow className="border-0">
                <TableHead className="sticky top-0 z-10 w-11 bg-muted/80 px-3 py-2.5 shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md supports-[backdrop-filter]:bg-muted/60" />
                <TableHead className="sticky top-0 z-10 min-w-[11rem] bg-muted/80 px-3 py-2.5 text-sm font-semibold tracking-wide text-foreground shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md supports-[backdrop-filter]:bg-muted/60">
                  Tender
                </TableHead>
                <TableHead className="sticky top-0 z-10 hidden w-[7.5rem] bg-muted/80 px-3 py-2.5 text-ms font-medium tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md sm:table-cell supports-[backdrop-filter]:bg-muted/60">
                  Country
                </TableHead>
                <TableHead className="sticky top-0 z-10 hidden min-w-[8.5rem] bg-muted/80 px-3 py-2.5 text-ms font-medium tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md md:table-cell supports-[backdrop-filter]:bg-muted/60">
                  Category
                </TableHead>
                <TableHead className="sticky top-0 z-10 w-[7.75rem] whitespace-nowrap bg-muted/80 px-3 py-2.5 text-ms font-medium tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md supports-[backdrop-filter]:bg-muted/60">
                  Deadline
                </TableHead>
                <TableHead className="sticky top-0 z-10 w-[8.25rem] bg-muted/80 px-3 py-2.5 text-ms font-medium tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md supports-[backdrop-filter]:bg-muted/60">
                  Status
                </TableHead>
                {isAdmin && (
                  <TableHead className="sticky top-0 z-10 w-11 bg-muted/80 px-2 py-2.5 shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md supports-[backdrop-filter]:bg-muted/60" />
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <SkeletonTableBody showAdminCol={isAdmin} />
              ) : tenders.length === 0 ? (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={isAdmin ? 7 : 6} className="h-auto py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
                        <TrendingUp className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">No tenders found</p>
                        <p className="mx-auto max-w-xs text-xs text-muted-foreground">
                          Try adjusting your search or filters to find what you&apos;re looking for.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tenders.map((t, idx) => {
                  const isExpanded = expandedId === t.id;
                  const colSpan = isAdmin ? 7 : 6;
                  const dDays = daysUntil(t.deadline);

                  return (
                    <Fragment key={t.id}>
                      <MotionTableRow
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15, delay: Math.min(idx * 0.012, 0.2) }}
                        tabIndex={0}
                        className={cn(
                          "group cursor-pointer border-b bg-background transition-colors hover:bg-muted/35",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                          "data-[expanded=true]:bg-muted/25"
                        )}
                        data-expanded={isExpanded || undefined}
                        onClick={() => navigate(`/tender/${t.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/tender/${t.id}`); }
                        }}
                      >
                        <TableCell className="relative w-11 px-3 py-3 align-middle">
                          <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary/0 transition-colors group-hover:bg-primary/70 group-data-[expanded=true]:bg-primary/50" />
                          <button
                            type="button"
                            onClick={(e) => toggleBookmark(t.id, e)}
                            className="relative z-0 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={bookmarks.has(t.id) ? "Remove bookmark" : "Save tender"}
                          >
                            {bookmarks.has(t.id) ? (
                              <BookmarkCheck className="h-4 w-4 text-foreground" />
                            ) : (
                              <Bookmark className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                            )}
                          </button>
                        </TableCell>

                        <TableCell className="max-w-[min(48vw,28rem)] py-3 pr-4 align-middle lg:max-w-md">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-start gap-2">
                              <span className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2 sm:line-clamp-1">
                                {t.title}
                              </span>
                            </div>
                            {(t.procuring_entity || t.reference_number) && (
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
                                {t.procuring_entity && (
                                  <span className="line-clamp-1">{t.procuring_entity}</span>
                                )}
                                {t.reference_number && (
                                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground/70">
                                    {t.reference_number}
                                  </span>
                                )}
                              </div>
                            )}
                            {t.summary_en && (
                              <div className="text-xs text-muted-foreground/80 line-clamp-2 mt-1">
                                {t.summary_en}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="hidden py-3 align-middle text-[13px] text-muted-foreground sm:table-cell">
                          <span className="line-clamp-2">{t.country ?? "—"}</span>
                        </TableCell>

                        <TableCell className="hidden py-3 align-middle md:table-cell">
                          {t.category ? (
                            <span className="inline-flex max-w-full rounded-lg border border-border/80 bg-muted/30 px-2 py-1 text-[11px] font-medium leading-none text-muted-foreground">
                              <span className="truncate">{t.category}</span>
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground/35">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-sm whitespace-nowrap">
                          <div className="text-[13px] font-semibold leading-snug text-foreground">{formatDate(t.deadline)}</div>
                          {dDays != null && (
                            <div className={cn(
                              "text-[10px]",
                              dDays < 0 ? "text-destructive" : dDays < 7 ? "text-warning" : "text-muted-foreground"
                            )}>
                              {dDays < 0 ? `${Math.abs(dDays)}d ago` : `in ${dDays}d`}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="py-3 align-middle">
                          <StatusBadge status={t.workflow_status} />
                        </TableCell>

                        {isAdmin && (
                          <TableCell className="w-11 px-2 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                  aria-label="Tender actions"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-sm">
                                <DropdownMenuItem onClick={() => setEditing(t)}>
                                  <Pencil className="mr-2 h-3 w-3" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(t)}>
                                  <Trash2 className="mr-2 h-3 w-3" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </MotionTableRow>

                      <AnimatePresence>
                        {isExpanded && t.summary_en && (
                          <TableRow key={`${t.id}-summary`} className="border-0 hover:bg-transparent">
                            <TableCell colSpan={colSpan} className="border-b border-border/55 p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="mx-4 mb-3 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-muted/30 px-4 py-3.5 shadow-sm">
                                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary/80">
                                    AI summary
                                  </p>
                                  <p className="text-sm leading-relaxed text-foreground/85">{t.summary_en}</p>
                                </div>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Desktop Pagination */}
          <div className="flex items-center justify-between border-t border-border/80 bg-muted/25 px-4 py-3">
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
        <div className="md:hidden overflow-hidden  ring-1 ring-border/50">
          {loading ? (
            <SkeletonCards />
          ) : tenders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
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
            <div className="divide-y divide-border/50 bg-background">
              {tenders.map((t, idx) => (
                <TenderCard
                  key={t.id}
                  t={t}
                  idx={idx}
                  isBookmarked={bookmarks.has(t.id)}
                  isAdmin={isAdmin}
                  onBookmark={toggleBookmark}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                  onClick={() => navigate(`/tender/${t.id}`)}
                />
              ))}
            </div>
          )}

          {/* Mobile Pagination */}
          <div className="flex items-center justify-between border-t border-border/80 bg-muted/25 px-4 py-3">
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

      {/* ── Dialogs ── */}
      <EditTenderDialog
        tender={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["tenders-list"] })}
      />

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
    </div>
  );
};

export default Tenders;