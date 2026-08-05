import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { CoverImageUpload } from "@/components/blog/CoverImageUpload";
import { RichTextEditor } from "@/components/blog/RichTextEditor";
import { Loader2, Sparkles, MoreHorizontal, Trash2, ExternalLink } from "@/components/icons";
import { POST_CATEGORIES } from "@/lib/blogCategories";

export type DeleteTarget = { id: string; title: string; status: "draft" | "published" };

type PostForm = {
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  content_html: string;
  status: "draft" | "published";
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
    .select("slug, title, excerpt, cover_image_url, content_html, status, source, category")
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
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const loading = !isNew && postQuery.isLoading;

  useEffect(() => {
    if (isNew) {
      setForm(EMPTY_FORM);
      setSlugTouched(false);
    } else if (postQuery.data) {
      setForm(postQuery.data);
      setSlugTouched(true);
    }
  }, [postId, isNew, postQuery.data]);

  const setTitle = (title: string) => {
    setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  };

  const save = async (status: "draft" | "published") => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("Title and slug are required");
      return;
    }
    setSaving(true);
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
      ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
    };

    const { data, error } = isNew
      ? await supabase.from("posts").insert(payload).select("id").single()
      : await supabase.from("posts").update(payload).eq("id", postId).select("id").single();

    setSaving(false);
    if (error) {
      toast.error(handleDbError(error));
      return;
    }

    toast.success(status === "published" ? "Post published" : "Draft saved");
    const savedForm = { ...form, status };
    setForm(savedForm);
    const savedId = isNew ? data.id : postId!;
    queryClient.setQueryData(["admin-post", savedId], savedForm);
    onSaved();
    if (isNew && data) onCreated(data.id);
  };

  return (
    <div className="flex h-full max-h-[90vh] flex-col">
      {/* HEADER — sticky so Save/Publish stay reachable while the body scrolls */}
      <div className="shrink-0 border-b border-border pl-6 pr-14 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <DialogTitle className="text-base font-semibold">{isNew ? "New post" : "Edit post"}</DialogTitle>
          <div className="mt-1 flex items-center gap-2">
            {!isNew && !loading && (
              <span
                className={cn(
                  "inline-block px-1.5 py-0.5 rounded border text-[10px] capitalize",
                  form.status === "published"
                    ? "bg-success/15 text-success border-success/30"
                    : "bg-muted text-muted-foreground border-border"
                )}
              >
                {form.status}
              </span>
            )}
            {form.source === "ai" && !loading && (
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <Sparkles className="h-3 w-3" /> AI-generated — review before publishing
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" disabled={saving || loading} onClick={() => save("draft")}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save draft
          </Button>
          <Button size="sm" disabled={saving || loading} onClick={() => save("published")}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Publish
          </Button>
          {!isNew && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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

      {/* BODY */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
            <div className="space-y-4">
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
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Main column — the two things that matter most: headline & body */}
            <div className="space-y-4 min-w-0">
              <Input
                value={form.title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                className="h-auto border-0 px-0 text-2xl font-semibold shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
              />
              <RichTextEditor
                value={form.content_html}
                onChange={(html) => setForm((f) => ({ ...f, content_html: html }))}
              />
            </div>

            {/* Sidebar — metadata */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
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

              <div className="space-y-1.5">
                <Label htmlFor="slug">Permalink</Label>
                <div className="flex items-stretch rounded-md border border-input bg-muted/30 overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                  <span className="flex items-center px-2.5 text-xs text-muted-foreground bg-muted/60 border-r border-input shrink-0">
                    /blog/
                  </span>
                  <input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
                    }}
                    placeholder="post-slug"
                    className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  rows={3}
                  placeholder="Short summary shown on the blog index and in search results"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Cover image</Label>
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
