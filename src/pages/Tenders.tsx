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

/* ── Skeleton rows ───────────────────────────────────────────────── */
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

/* ── Main page ───────────────────────────────────────────────────── */
const Tenders = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [countries, setCountries] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const [editing, setEditing] = useState<Tender | null>(null);
  const [deleting, setDeleting] = useState<Tender | null>(null);

  const isAdmin = role === "admin";

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("tenders")
      .select("*", { count: "exact" })
      .order("deadline", { ascending: true, nullsFirst: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
      .eq("enrichment_status", "enriched");


    if (search.trim()) {
      const s = search.trim().replace(/,/g, " ");
      query = query.or(
        `title.ilike.%${s}%,procuring_entity.ilike.%${s}%,reference_number.ilike.%${s}%`
      );
    }
    if (country !== "all") query = query.eq("country", country);
    if (category !== "all") query = query.eq("category", category);
    if (status !== "all") query = query.eq("workflow_status", status);

    const { data, error, count } = await query;
    if (error) toast.error(handleDbError(error));
    setTenders((data as Tender[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  };

  const loadFacets = async () => {
    const { data } = await supabase.from("tenders").select("country, category").limit(1000);
    if (data) {
      setCountries([...new Set(data.map((d) => d.country).filter(Boolean) as string[])].sort());
      setCategories([...new Set(data.map((d) => d.category).filter(Boolean) as string[])].sort());
    }
  };

  const loadBookmarks = async () => {
    const uid = user?.id ?? getAnonUserId();
    const { data } = await supabase.from("tender_bookmarks").select("tender_id").eq("user_id", uid);
    setBookmarks(new Set((data ?? []).map((d) => d.tender_id)));
  };

  useEffect(() => { loadFacets(); loadBookmarks(); }, [user]);
  useEffect(() => { load(); }, [page, search, country, category, status]);
  useEffect(() => { setPage(0); }, [search, country, category, status]);

  const toggleBookmark = async (tenderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const uid = user?.id ?? getAnonUserId();
    const has = bookmarks.has(tenderId);
    if (has) {
      const { error } = await supabase
        .from("tender_bookmarks").delete().eq("user_id", uid).eq("tender_id", tenderId);
      if (error) return toast.error(handleDbError(error));
      setBookmarks((b) => { const n = new Set(b); n.delete(tenderId); return n; });
    } else {
      const { error } = await supabase
        .from("tender_bookmarks").insert({ user_id: uid, tender_id: tenderId });
      if (error) return toast.error(handleDbError(error));
      setBookmarks((b) => new Set(b).add(tenderId));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("tenders").delete().eq("id", deleting.id);
    if (error) { toast.error(handleDbError(error)); return; }
    toast.success("Tender deleted");
    setDeleting(null);
    load();
  };

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-1">
            <h1 style={{ fontFamily: "serif" }} className="text-2xl font-semibold tracking-tight text-foreground">Tenders</h1>
            <p className="text-sm text-muted-foreground">
              Browse and triage live procurement opportunities.
            </p>
          </div>

          <div className="flex items-center gap-6 ">
            <Stat label="Total" value={total.toLocaleString()} />
            <div className="pl-8">
              <Stat
                label="Closing soon"
                value={urgentCount}

              />
            </div>
            <div className="pl-8">
              <Stat label="Saved" value={bookmarks.size} />
            </div>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[260px]   rounded-lg border  border-gray-200 ">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search title, entity, reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm bg-background"
            />
          </div>

          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-[148px] h-9 text-sm  shadow-sm rounded-lg border  border-gray-200 ">
              <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[168px] h-9 text-sm  shadow-sm rounded-lg border  border-gray-200 ">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[148px] h-9 text-sm  shadow-sm rounded-lg border  border-gray-200 ">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {WORKFLOW_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {activeFilters.length > 0 && (
            <button
              onClick={() => { setCountry("all"); setCategory("all"); setStatus("all"); }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ── Active filter chips ── */}
        {activeFilters.length > 0 && (
          <div className="flex gap-2 flex-wrap -mt-4">
            {activeFilters.map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-foreground">
                {f}
              </span>
            ))}
          </div>
        )}

        {/* ── Table ── */}
        <div className="overflow-hidden shadow-sm rounded-lg border  border-gray-200 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <Table className="border-separate border-spacing-0 [&_tr]:border-border/55 ">
            <TableHeader className="[&_tr]:border-b [&_tr]:border-border/70 overflow-hidden">
              <TableRow className="border-0">
                <TableHead className="sticky top-0 z-20 w-11 bg-muted/80 px-3 py-2.5 shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md supports-[backdrop-filter]:bg-muted/60" />

                <TableHead className="sticky top-0 z-20 min-w-[11rem] bg-muted/80 px-3 py-2.5 text-sm font-semibold tracking-wide text-foreground shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md supports-[backdrop-filter]:bg-muted/60">
                  Tender
                </TableHead>

                <TableHead className="sticky top-0 z-20 hidden w-[7.5rem] bg-muted/80 px-3 py-2.5 text-ms font-medium tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md sm:table-cell supports-[backdrop-filter]:bg-muted/60">
                  Country
                </TableHead>

                <TableHead className="sticky top-0 z-20 hidden min-w-[8.5rem] bg-muted/80 px-3 py-2.5 text-ms font-medium tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md md:table-cell supports-[backdrop-filter]:bg-muted/60">
                  Category
                </TableHead>

                <TableHead className="sticky top-0 z-20 w-[7.75rem] whitespace-nowrap bg-muted/80 px-3 py-2.5 text-ms font-medium tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md supports-[backdrop-filter]:bg-muted/60">
                  Deadline
                </TableHead>

                <TableHead className="sticky top-0 z-20 w-[8.25rem] bg-muted/80 px-3 py-2.5 text-ms font-medium tracking-wide text-muted-foreground shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md supports-[backdrop-filter]:bg-muted/60">
                  Status
                </TableHead>

                {isAdmin && (
                  <TableHead className="sticky top-0 z-20 w-11 bg-muted/80 px-2 py-2.5 shadow-[inset_0_-1px_0_0_hsl(var(--border))] backdrop-blur-md supports-[backdrop-filter]:bg-muted/60" />
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
                  const hasSummary = !!t.summary_en;
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
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/tender/${t.id}`);
                          }
                        }}
                      >
                        <TableCell className="relative w-11 px-3 py-3 align-middle">
                          <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary/0 transition-colors group-hover:bg-primary/70 group-data-[expanded=true]:bg-primary/50" />
                          <button
                            type="button"
                            onClick={(e) => toggleBookmark(t.id, e)}
                            className="relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                          <div className="text-[13px] font-semibold leading-snug text-foreground" >{formatDate(t.deadline)}</div>
                          {dDays != null && (
                            <div
                              className={cn(
                                "text-[10px]",
                                dDays < 0
                                  ? "text-destructive"
                                  : dDays < 7
                                    ? "text-warning"
                                    : "text-muted-foreground"
                              )}
                            >
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

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border/80 bg-muted/25 px-4 py-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {total === 0
                ? "No results"
                : `${(page * PAGE_SIZE + 1).toLocaleString()}–${Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()} of ${total.toLocaleString()}`}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-1 tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setPage((p) => p + 1)}
                disabled={page + 1 >= totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Dialogs ── */}
      <EditTenderDialog
        tender={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onSaved={load}
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