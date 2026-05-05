import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookmarkCheck, BookmarkX, ExternalLink, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tender } from "@/lib/types";
import { getAnonUserId } from "@/lib/anonUser";
import { handleDbError } from "@/lib/dbError";
import { formatDate, daysUntil } from "@/lib/format";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        <TableCell className="py-3">
          <div className="space-y-2">
            <div className="h-3.5 w-4/5 rounded-md bg-muted" />
            <div className="h-3 w-2/5 rounded-md bg-muted/70" />
          </div>
        </TableCell>
        <TableCell><div className="h-3.5 w-16 rounded-md bg-muted/70" /></TableCell>
        <TableCell><div className="h-3.5 w-20 rounded-md bg-muted/60" /></TableCell>
        <TableCell><div className="h-6 w-20 rounded-full bg-muted/50" /></TableCell>
        <TableCell className="text-right">
          <div className="inline-flex gap-2 justify-end">
            <div className="h-7 w-16 rounded-md bg-muted/60" />
            <div className="h-7 w-20 rounded-md bg-muted/50" />
          </div>
        </TableCell>
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

      return (rows as Tender[]) ?? [];
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

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return tenders.filter((t) => {
      if (country !== "all" && (t.country ?? "") !== country) return false;
      if (status !== "all" && (t.workflow_status ?? "") !== status) return false;
      if (!s) return true;
      const hay = `${t.title ?? ""} ${t.procuring_entity ?? ""} ${t.reference_number ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [tenders, search, country, status]);

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
  }, [search, country, status, sort]);

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
        <div className="flex-1">
          <Input
            placeholder="Search title, entity, reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 rounded-lg"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={country} onValueChange={setCountry} disabled={loading}>
            <SelectTrigger className="h-10 w-[180px] rounded-lg border border-border bg-background text-sm">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "all" ? "All countries" : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus} disabled={loading}>
            <SelectTrigger className="h-10 w-[170px] rounded-lg border border-border bg-background text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All statuses" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setSort(v as any)} disabled={loading}>
            <SelectTrigger className="h-10 w-[190px] rounded-lg border border-border bg-background text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline-asc">Deadline: soonest</SelectItem>
              <SelectItem value="deadline-desc">Deadline: latest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Desktop table (md+) ── */}
      <div className="hidden md:block overflow-hidden rounded-lg border border-border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">Tender</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows />
            ) : pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-0">
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
              pageItems.map((t) => {
                const dueIn = daysUntil(t.deadline);
                return (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/tender/${t.id}`)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium leading-snug line-clamp-2">{t.title}</p>
                        {t.procuring_entity && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {t.procuring_entity}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{t.country ?? "—"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(t.deadline)}</div>
                        {dueIn != null && (
                          <div className="text-xs text-muted-foreground">
                            {dueIn < 0 ? `${Math.abs(dueIn)}d ago` : `in ${dueIn}d`}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.workflow_status} />
                    </TableCell>
                    <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/tender/${t.id}`)}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Open
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => removeBookmark(t.id, e)}>
                        <BookmarkX className="h-3.5 w-3.5 mr-1.5" />
                        Remove
                      </Button>
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
                  <StatusBadge status={t.workflow_status} />
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