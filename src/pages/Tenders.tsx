import { useEffect, useMemo, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { handleDbError } from "@/lib/dbError";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const PAGE_SIZE = 50;

const Tenders = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

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
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

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
    const { data } = await supabase
      .from("tenders")
      .select("country, category")
      .limit(1000);
    if (data) {
      setCountries(
        [...new Set(data.map((d) => d.country).filter(Boolean) as string[])].sort()
      );
      setCategories(
        [...new Set(data.map((d) => d.category).filter(Boolean) as string[])].sort()
      );
    }
  };

  const loadBookmarks = async () => {
    const uid = user?.id ?? getAnonUserId();
    const { data } = await supabase
      .from("tender_bookmarks")
      .select("tender_id")
      .eq("user_id", uid);
    setBookmarks(new Set((data ?? []).map((d) => d.tender_id)));
  };

  useEffect(() => {
    loadFacets();
    loadBookmarks();
  }, [user]);

  useEffect(() => {
    load();
  }, [page, search, country, category, status]);

  useEffect(() => {
    setPage(0);
  }, [search, country, category, status]);

  const toggleBookmark = async (tenderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const uid = user?.id ?? getAnonUserId();
    const has = bookmarks.has(tenderId);
    if (has) {
      const { error } = await supabase
        .from("tender_bookmarks")
        .delete()
        .eq("user_id", uid)
        .eq("tender_id", tenderId);
      if (error) return toast.error(handleDbError(error));
      setBookmarks((b) => {
        const n = new Set(b);
        n.delete(tenderId);
        return n;
      });
    } else {
      const { error } = await supabase
        .from("tender_bookmarks")
        .insert({ user_id: uid, tender_id: tenderId });
      if (error) return toast.error(handleDbError(error));
      setBookmarks((b) => new Set(b).add(tenderId));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("tenders").delete().eq("id", deleting.id);
    if (error) {
      toast.error(handleDbError(error));
      return;
    }
    toast.success("Tender deleted");
    setDeleting(null);
    load();
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const headerStats = useMemo(
    () => [
      { label: "Total visible", value: total.toLocaleString() },
      {
        label: "Closing in 7d",
        value: tenders.filter((t) => {
          const d = daysUntil(t.deadline);
          return d != null && d >= 0 && d <= 7;
        }).length,
      },
      { label: "Bookmarked", value: bookmarks.size },
    ],
    [total, tenders, bookmarks]
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tenders</h1>
          <p className="text-sm text-muted-foreground">
            Browse, filter and triage live tender opportunities.
          </p>
        </div>
        <div className="flex gap-6">
          {headerStats.map((s) => (
            <div key={s.label}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
              <div className="text-xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="p-3 border-b border-border flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, entity, reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {WORKFLOW_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-[40px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-10">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : tenders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground py-10">
                    No tenders match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                tenders.map((t, idx) => {
                  const dDays = daysUntil(t.deadline);
                  return (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.015, 0.25), ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => navigate(`/tender/${t.id}`)}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <TableCell onClick={(e) => toggleBookmark(t.id, e)}>
                        {bookmarks.has(t.id) ? (
                          <BookmarkCheck className="h-4 w-4 text-accent" />
                        ) : (
                          <Bookmark className="h-4 w-4 text-muted-foreground hover:text-accent" />
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="font-medium leading-snug line-clamp-2">{t.title}</div>
                        {t.procuring_entity && (
                          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {t.procuring_entity}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{t.country ?? "—"}</TableCell>
                      <TableCell className="text-sm">{t.category ?? "—"}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <div>{formatDate(t.deadline)}</div>
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
                      <TableCell>
                        <StatusBadge status={t.workflow_status} />
                      </TableCell>
                      {isAdmin && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditing(t)}>
                                <Pencil className="h-3 w-3 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleting(t)}
                              >
                                <Trash2 className="h-3 w-3 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </motion.tr>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-3 border-t border-border flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            {total === 0
              ? "0 results"
              : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>



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
