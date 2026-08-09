import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";
import { handleDbError } from "@/lib/dbError";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { CoverImageUpload } from "@/components/blog/CoverImageUpload";
import { RichTextEditor } from "@/components/blog/RichTextEditor";
import { Sparkles, MoreHorizontal, Trash2, ExternalLink } from "@/components/icons";
import { POST_CATEGORIES } from "@/lib/blogCategories";

export type DeleteTarget = { id: string; title: string; status: "draft" | "scheduled" | "published" };

type PostStatus = "draft" | "scheduled" | "published";

type PostForm = {
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  content_html: string;
  status: PostStatus;
  scheduled_at: string | null;
  source: "manual" | "ai";
  category: string;
};

const EMPTY_FORM: PostForm = {
  slug: "",
  title: "",
  excerpt: "",
  cover_image_url: null,
  content_html: "",
  status: "draft",
  scheduled_at: null,
  source: "manual",
  category: "General",
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const fetchPost = async (postId: string): Promise<PostForm> => {
  const { data, error } = await supabase
    .from("posts")
    .select("slug, title, excerpt, cover_image_url, content_html, status, scheduled_at, source, category")
    .eq("id", postId)
    .maybeSingle();
  if (error) throw new Error(handleDbError(error, "Failed to load post"));
  if (!data) throw new Error("Post not found");
  return data as PostForm;
};

export type PostEditorProps = {
  // null = creating a new post; a string = editing that post's id.
  postId: string | null;
  onSaved: () => void;
  // Fired right after a brand-new post's first save, so the parent can swap
  // the modal from "new" to "editing <id>" without closing it.
  onCreated: (id: string) => void;
  onDeleteRequest: (target: DeleteTarget) => void;
};

const FieldSkeleton = ({ labelWidth = "w-16" }: { labelWidth?: string }) => (
  <div className="space-y-1.5">
    <Skeleton className={cn("h-3.5", labelWidth)} />
    <Skeleton className="h-10 w-full" />
  </div>
);

export default function PostEditor({ postId, onSaved, onCreated, onDeleteRequest }: PostEditorProps) {
  const isNew = !postId;
  const queryClient = useQueryClient();

  const postQuery = useQuery({
    queryKey: ["admin-post", postId],
    queryFn: () => fetchPost(postId as string),
    enabled: !isNew,
    staleTime: 30_000,
  });

  const [form, setForm] = useState<PostForm>(EMPTY_FORM);
  // Snapshot of the last-saved (or just-loaded) form, so the header can tell
  // "already published, nothing new to push" apart from "published, but
  // you've made changes since" — see isDirty below.
  const [initialForm, setInitialForm] = useState<PostForm>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  // Tracks which action is in flight (not just whether *something* is), so
  // clicking "Publish" doesn't also show a busy state on "Save draft".
  const [savingAction, setSavingAction] = useState<PostStatus | null>(null);
  const loading = !isNew && postQuery.isLoading;

  useEffect(() => {
    if (isNew) {
      setForm(EMPTY_FORM);
      setInitialForm(EMPTY_FORM);
      setSlugTouched(false);
    } else if (postQuery.data) {
      setForm(postQuery.data);
      setInitialForm(postQuery.data);
      setSlugTouched(true);
    }
  }, [postId, isNew, postQuery.data]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const setTitle = (title: string) => {
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  };

  const save = async (status: PostStatus) => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("Title and slug are required");
      return;
    }
    if (status === "scheduled" && !form.scheduled_at) {
      toast.error("Pick a publish date first");
      return;
    }
    setSavingAction(status);
    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      cover_image_url: form.cover_image_url,
      content_html: form.content_html,
      category: form.category,
      status,
      seo_title: form.title.trim(),
      seo_description: form.excerpt.trim() || null,
      // Only stamped on the transition *into* published, so re-saving an
      // already-published post ("Update") doesn't keep bumping it to the
      // top of the blog as if it were newly published.
      ...(status === "published" && form.status !== "published"
        ? { published_at: new Date().toISOString() }
        : {}),
      // A schedule date only means something for a not-yet-published post —
      // clear it once published (immediately or via the cron flip) so it
      // doesn't linger as stale info.
      scheduled_at: status === "scheduled" ? form.scheduled_at : null,
    };

    const { data, error } = isNew
      ? await supabase.from("posts").insert(payload).select("id").single()
      : await supabase.from("posts").update(payload).eq("id", postId).select("id").single();

    setSavingAction(null);
    if (error) {
      toast.error(handleDbError(error));
      return;
    }

    toast.success(
      status === "published"
        ? "Post published"
        : status === "scheduled"
          ? `Post scheduled for ${formatDateTime(payload.scheduled_at)}`
          : "Draft saved"
    );
    const savedForm = { ...form, status, scheduled_at: payload.scheduled_at };
    setForm(savedForm);
    setInitialForm(savedForm);
    const savedId = isNew ? data.id : postId!;
    queryClient.setQueryData(["admin-post", savedId], savedForm);
    onSaved();
    if (isNew && data) onCreated(data.id);
  };

  // A schedule date only applies while the post isn't live yet — see the
  // sidebar field, hidden once published. Publishing an already-published
  // post again ("Update") is only worth doing — and only enabled — once
  // there's something new to push; otherwise the button would just be a
  // no-op resave with a misleading "Publish" label.
  const hasScheduleDate = form.status !== "published" && !!form.scheduled_at;
  const primaryStatus: PostStatus = hasScheduleDate ? "scheduled" : "published";
  const primaryLabel = hasScheduleDate
    ? "Schedule"
    : form.status === "published"
      ? isDirty
        ? "Update"
        : "Published"
      : "Publish";
  const primaryDisabled =
    savingAction !== null || loading || (form.status === "published" && !isDirty && !hasScheduleDate);
  const primaryBusyLabel =
    primaryStatus === "scheduled" ? "Scheduling…" : form.status === "published" ? "Updating…" : "Publishing…";

  return (
    <div className="flex h-full flex-col">
      {/* HEADER — stacks on mobile (title/badges, then actions below) so a
          long "AI-generated" note and the action buttons never fight for the
          same row and collide; sits side-by-side again from sm+. Sticky so
          Save/Publish stay reachable while the body scrolls. */}
      <div className="shrink-0 flex flex-col gap-3 pl-4 pr-10 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pl-7 sm:pr-14 sm:py-5">
        <div className="min-w-0">
          <DialogTitle className="text-lg font-semibold tracking-tight">{isNew ? "New post" : "Edit post"}</DialogTitle>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {!isNew && !loading && (
              <>
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium capitalize",
                    form.status === "published"
                      ? "bg-success/15 text-success border-success/30"
                      : form.status === "scheduled"
                        ? "bg-warning/15 text-warning border-warning/30"
                        : "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {form.status}
                </span>
                {form.status === "scheduled" && form.scheduled_at && (
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(form.scheduled_at)}
                  </span>
                )}
              </>
            )}
            {form.source === "ai" && !loading && (
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <Sparkles className="h-3 w-3 shrink-0" /> AI-generated - review before publishing
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial"
            disabled={savingAction !== null || loading}
            onClick={() => save("draft")}
          >
            {savingAction === "draft" ? "Saving…" : "Save draft"}
          </Button>
          <Button size="sm" className="flex-1 sm:flex-initial" disabled={primaryDisabled} onClick={() => save(primaryStatus)}>
            {savingAction === primaryStatus ? primaryBusyLabel : primaryLabel}
          </Button>
          {!isNew && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="More actions"
                  disabled={loading}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {form.status === "published" && (
                  <DropdownMenuItem asChild>
                    <a href={`/blog/${form.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-2" /> View live
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeleteRequest({ id: postId as string, title: form.title, status: form.status })}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* BODY — the rich text editor scrolls internally (fixed height), but
          the sidebar (category/permalink/excerpt/cover image) can still be
          taller than that on its own, so this wrapper needs to keep
          scrolling too or that content gets clipped with no way to reach it. */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-7 sm:py-0">
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:gap-10">
            <div className="space-y-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
            <div className="space-y-5">
              <FieldSkeleton />
              <FieldSkeleton labelWidth="w-10" />
              <FieldSkeleton labelWidth="w-14" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-40 w-full" />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:gap-10">
            {/* Main column — the two things that matter most: headline & body */}
            <div className="space-y-5 min-w-0">
              <Input
                value={form.title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                className="h-auto border-0 px-0 text-2xl font-semibold tracking-tight shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0 sm:text-3xl"
              />
              <RichTextEditor
                value={form.content_html}
                onChange={(html) => setForm((f) => ({ ...f, content_html: html }))}
              />
            </div>

            {/* Sidebar — metadata */}
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(category) => setForm((f) => ({ ...f, category }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.status !== "published" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Schedule (optional)</Label>
                  <DateTimePicker
                    value={form.scheduled_at}
                    onChange={(iso) => setForm((f) => ({ ...f, scheduled_at: iso }))}
                    placeholder="Publish immediately"
                  />
                  {form.scheduled_at && (
                    <p className="text-[11px] text-muted-foreground">
                      Publishes automatically {formatDateTime(form.scheduled_at)}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Cover image</Label>
                <CoverImageUpload
                  value={form.cover_image_url}
                  onChange={(url) => setForm((f) => ({ ...f, cover_image_url: url }))}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
