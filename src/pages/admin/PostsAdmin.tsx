import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/datetime-picker";
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
import { toast } from "@/components/ui/sonner";
import { handleDbError } from "@/lib/dbError";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatTile } from "@/components/analytics/StatTile";
import {
  Plus,
  Sparkles,
  Loader2,
  Pencil,
  FileText,
  CheckCircle2,
  Search,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Calendar,
} from "@/components/icons";
import PostEditor, { type DeleteTarget } from "./PostEditor";

type Post = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "scheduled" | "published";
  scheduled_at: string | null;
  source: "manual" | "ai";
  category: string;
  cover_image_url: string | null;
  updated_at: string;
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Drafts" },
] as const;

const statusBadgeClass = (s: string) =>
  s === "published"
    ? "bg-success/15 text-success border-success/30"
    : s === "scheduled"
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-muted text-muted-foreground border-border";

const sourceBadgeClass = (s: string) =>
  s === "ai" ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border";

const fetchPosts = async (): Promise<Post[]> => {
  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, status, scheduled_at, source, category, cover_image_url, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(handleDbError(error, "Failed to load posts"));
  return (data as Post[]) ?? [];
};

const CoverThumb = ({ url }: { url: string | null }) =>
  url ? (
    <img src={url} alt="" className="h-9 w-9 shrink-0 rounded-md border border-border object-cover" />
  ) : (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground/50">
      <ImageIcon className="h-4 w-4" />
    </div>
  );

const RowActions = ({
  post,
  onEdit,
  onSchedule,
  onDelete,
}: {
  post: Post;
  onEdit: () => void;
  onSchedule: () => void;
  onDelete: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        onClick={(e) => e.stopPropagation()}
        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Post actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
      <DropdownMenuItem onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
      </DropdownMenuItem>
      {post.status !== "published" && (
        <DropdownMenuItem onClick={onSchedule}>
          <Calendar className="h-3.5 w-3.5 mr-2" />
          {post.status === "scheduled" ? "Reschedule…" : "Schedule…"}
        </DropdownMenuItem>
      )}
      {post.status === "published" && (
        <DropdownMenuItem asChild>
          <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-2" /> View live
          </a>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export default function PostsAdmin() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("all");
  // undefined = modal closed; null = creating a new post; a string = editing that post's id.
  const [editorPostId, setEditorPostId] = useState<string | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Quick-schedule from the row menu, without opening the full editor.
  const [schedulingTarget, setSchedulingTarget] = useState<Post | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const postsQuery = useQuery({ queryKey: ["admin-posts"], queryFn: fetchPosts, staleTime: 30_000 });
  const posts = useMemo(() => postsQuery.data ?? [], [postsQuery.data]);
  const loading = postsQuery.isLoading;

  const invalidatePosts = () => queryClient.invalidateQueries({ queryKey: ["admin-posts"] });

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [posts, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((p) => p.status === "published").length,
      drafts: posts.filter((p) => p.status === "draft").length,
      needsReview: posts.filter((p) => p.source === "ai" && p.status === "draft").length,
    }),
    [posts]
  );

  const generatePost = async () => {
    setGenerating(true);
    toast.info("Generating a draft from live tender trends...");
    try {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        post?: { id: string; slug: string };
        error?: string;
      }>("generate-blog-post", { body: {} });
      if (error) throw error;
      if (!data?.post?.id) throw new Error(data?.error ?? "No post returned");
      toast.success("Draft generated — review it in the table below");
      await invalidatePosts();
    } catch (e) {
      toast.error("Generation failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setGenerating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("posts").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error(handleDbError(error, "Failed to delete post"));
      return;
    }
    toast.success("Post deleted");
    setDeleteTarget(null);
    if (editorPostId === deleteTarget.id) setEditorPostId(undefined);
    invalidatePosts();
  };

  const openSchedule = (post: Post) => {
    setSchedulingTarget(post);
    setScheduleDraft(post.scheduled_at);
  };

  const confirmSchedule = async () => {
    if (!schedulingTarget) return;
    setScheduling(true);
    // No date picked = pulling it out of the schedule, back to draft.
    const nextStatus = scheduleDraft ? "scheduled" : "draft";
    const { error } = await supabase
      .from("posts")
      .update({ status: nextStatus, scheduled_at: scheduleDraft })
      .eq("id", schedulingTarget.id);
    setScheduling(false);
    if (error) {
      toast.error(handleDbError(error));
      return;
    }
    toast.success(scheduleDraft ? `Scheduled for ${formatDateTime(scheduleDraft)}` : "Removed from schedule — back to draft");
    setSchedulingTarget(null);
    invalidatePosts();
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Blog posts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-generated drafts land here for review - nothing publishes automatically.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-col sm:flex-row ">
          <Button variant="outline" className="rounded-lg" size="sm" onClick={generatePost} disabled={generating}>
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            Generate post
          </Button>
          <Button size="sm" className="rounded-lg" onClick={() => setEditorPostId(null)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New post
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total posts" value={loading ? "—" : stats.total} icon={FileText} />
        <StatTile label="Published" value={loading ? "—" : stats.published} icon={CheckCircle2} />
        <StatTile label="Drafts" value={loading ? "—" : stats.drafts} icon={Pencil} />
        <StatTile label="Needs review" value={loading ? "—" : stats.needsReview} icon={Sparkles} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList>
            {STATUS_FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or category…"
            className="h-9 pl-8 text-sm"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2">Title</th>
                <th className="text-left font-medium px-4 py-2">Category</th>
                <th className="text-left font-medium px-4 py-2">Status</th>
                <th className="text-left font-medium px-4 py-2">Source</th>
                <th className="text-left font-medium px-4 py-2">Updated</th>
                <th className="px-4 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-2.5"><Skeleton className="h-4 w-14" /></td>
                    <td className="px-4 py-2.5"><Skeleton className="h-4 w-14" /></td>
                    <td className="px-4 py-2.5"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-2.5" />
                  </tr>
                ))
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <FileText className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {posts.length === 0 ? "No posts yet" : "No posts match your filters"}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {posts.length === 0
                          ? "Generate one from live tender trends or write one from scratch."
                          : "Try a different search term or status filter."}
                      </p>
                      {posts.length === 0 && (
                        <Button size="sm" className="mt-2" onClick={() => setEditorPostId(null)}>
                          <Plus className="h-3.5 w-3.5 mr-1.5" /> New post
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPosts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setEditorPostId(p.id)}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5 max-w-md">
                        <CoverThumb url={p.cover_image_url} />
                        <span className="font-medium text-foreground truncate">{p.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{p.category}</td>
                    <td className="px-4 py-2">
                      <Badge
                        variant="outline"
                        className={statusBadgeClass(p.status)}
                        title={
                          p.status === "scheduled" && p.scheduled_at
                            ? `Publishes ${formatDateTime(p.scheduled_at)}`
                            : undefined
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className={sourceBadgeClass(p.source)}>
                        {p.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(p.updated_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <RowActions
                        post={p}
                        onEdit={() => setEditorPostId(p.id)}
                        onSchedule={() => openSchedule(p)}
                        onDelete={() => setDeleteTarget({ id: p.id, title: p.title, status: p.status })}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-border/60">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 rounded-md shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {posts.length === 0 ? "No posts yet" : "No posts match your filters"}
              </p>
              {posts.length === 0 && (
                <Button size="sm" className="mt-1" onClick={() => setEditorPostId(null)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> New post
                </Button>
              )}
            </div>
          ) : (
            filteredPosts.map((p) => (
              <div
                key={p.id}
                className="px-4 py-3.5 flex items-center gap-2.5 cursor-pointer"
                onClick={() => setEditorPostId(p.id)}
              >
                <CoverThumb url={p.cover_image_url} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="block text-[13px] font-medium text-foreground truncate">{p.title}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">{p.category}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", statusBadgeClass(p.status))}
                      title={
                        p.status === "scheduled" && p.scheduled_at
                          ? `Publishes ${formatDateTime(p.scheduled_at)}`
                          : undefined
                      }
                    >
                      {p.status}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px]", sourceBadgeClass(p.source))}>
                      {p.source}
                    </Badge>
                  </div>
                </div>
                <RowActions
                  post={p}
                  onEdit={() => setEditorPostId(p.id)}
                  onSchedule={() => openSchedule(p)}
                  onDelete={() => setDeleteTarget({ id: p.id, title: p.title, status: p.status })}
                />
              </div>
            ))
          )}
        </div>
      </Card>

      <Dialog open={editorPostId !== undefined} onOpenChange={(open) => !open && setEditorPostId(undefined)}>
        <DialogContent
          className={cn(
            "p-0 gap-0 overflow-hidden flex flex-col",
            // Full-screen on mobile — edge to edge, no floating rounded card
            // that has to also solve internal scrolling on a tiny viewport.
            "!inset-0 !left-0 !top-0 !h-full !max-h-full !w-full !max-w-full !translate-x-0 !translate-y-0 !rounded-none",
            // Back to a normal centered, rounded modal from sm+.
            "sm:!inset-auto sm:!left-[50%] sm:!top-[50%] sm:!h-auto sm:!max-h-[85vh] sm:!w-full sm:!max-w-4xl sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:!rounded-2xl",
            "lg:!max-w-5xl"
          )}
        >
          {editorPostId !== undefined && (
            <PostEditor
              postId={editorPostId}
              onSaved={invalidatePosts}
              onCreated={(id) => setEditorPostId(id)}
              onDeleteRequest={setDeleteTarget}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This can't be undone. The post will be permanently removed{deleteTarget?.status === "published" ? " and immediately taken offline" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!schedulingTarget} onOpenChange={(open) => !open && setSchedulingTarget(null)}>
        <DialogContent className="w-[92vw] max-w-[92vw] max-h-[85vh] overflow-y-auto rounded-2xl sm:w-full sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">Schedule "{schedulingTarget?.title}"</DialogTitle>
          </DialogHeader>
          <DateTimePicker value={scheduleDraft} onChange={setScheduleDraft} placeholder="Publish immediately" />
          <p className="text-xs text-muted-foreground">
            {scheduleDraft
              ? `Publishes automatically ${formatDateTime(scheduleDraft)}.`
              : "No date picked — saving now will send this back to a draft."}
          </p>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled={scheduling} onClick={() => setSchedulingTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="w-full sm:w-auto" disabled={scheduling} onClick={() => void confirmSchedule()}>
              {scheduling ? "Saving…" : scheduleDraft ? "Schedule" : "Save as draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
