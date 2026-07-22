import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { handleDbError } from "@/lib/dbError";
import { CoverImageUpload } from "@/components/blog/CoverImageUpload";
import { RichTextEditor } from "@/components/blog/RichTextEditor";
import { ArrowLeft, Loader2, Sparkles } from "@/components/icons";

type PostForm = {
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  content_html: string;
  status: "draft" | "published";
  source: "manual" | "ai";
};

const EMPTY_FORM: PostForm = {
  slug: "",
  title: "",
  excerpt: "",
  cover_image_url: null,
  content_html: "",
  status: "draft",
  source: "manual",
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export default function PostEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [form, setForm] = useState<PostForm>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from("posts")
      .select("slug, title, excerpt, cover_image_url, content_html, status, source")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error(handleDbError(error, "Failed to load post"));
        } else if (data) {
          setForm(data as PostForm);
          setSlugTouched(true);
        }
        setLoading(false);
      });
  }, [id, isNew]);

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
      status,
      seo_title: form.title.trim(),
      seo_description: form.excerpt.trim() || null,
      ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
    };

    const { data, error } = isNew
      ? await supabase.from("posts").insert(payload).select("id").single()
      : await supabase.from("posts").update(payload).eq("id", id).select("id").single();

    setSaving(false);
    if (error) {
      toast.error(handleDbError(error));
      return;
    }

    toast.success(status === "published" ? "Post published" : "Draft saved");
    setForm((f) => ({ ...f, status }));
    if (isNew && data) navigate(`/admin/posts/${data.id}`, { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate("/admin/posts")}
        className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Posts
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">{isNew ? "New post" : "Edit post"}</h1>
          {form.source === "ai" && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
              <Sparkles className="h-3 w-3" /> AI-generated draft — review before publishing
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={saving} onClick={() => save("draft")}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save draft
          </Button>
          <Button size="sm" disabled={saving} onClick={() => save("published")}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Publish
          </Button>
        </div>
      </div>

      <Card className="p-5 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={form.title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm((f) => ({ ...f, slug: slugify(e.target.value) }));
            }}
            placeholder="post-slug"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            rows={2}
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

        <div className="space-y-1.5">
          <Label>Content</Label>
          <RichTextEditor
            value={form.content_html}
            onChange={(html) => setForm((f) => ({ ...f, content_html: html }))}
          />
        </div>
      </Card>
    </div>
  );
}
