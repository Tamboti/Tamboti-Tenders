import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { handleDbError } from "@/lib/dbError";
import { Plus, Sparkles, Loader2, Pencil } from "@/components/icons";

type Post = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  source: "manual" | "ai";
  updated_at: string;
};

const statusVariant = (s: string) =>
  s === "published"
    ? "bg-success/15 text-success border-success/30"
    : "bg-muted text-muted-foreground border-border";

const sourceVariant = (s: string) =>
  s === "ai" ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border";

export default function PostsAdmin() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, slug, title, status, source, updated_at")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error(handleDbError(error, "Failed to load posts"));
    } else {
      setPosts((data as Post[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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
      toast.success("Draft generated");
      navigate(`/admin/posts/${data.post.id}`);
    } catch (e) {
      toast.error("Generation failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Blog posts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-generated drafts land here for review — nothing publishes automatically.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={generatePost} disabled={generating}>
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            Generate post
          </Button>
          <Button size="sm" onClick={() => navigate("/admin/posts/new")}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New post
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2">Title</th>
                <th className="text-left font-medium px-4 py-2">Status</th>
                <th className="text-left font-medium px-4 py-2">Source</th>
                <th className="text-left font-medium px-4 py-2">Updated</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No posts yet. Generate one from live trends or write one from scratch.
                  </td>
                </tr>
              ) : (
                posts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/posts/${p.id}`)}
                  >
                    <td className="px-4 py-2 font-medium text-foreground max-w-md truncate">{p.title}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${statusVariant(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${sourceVariant(p.source)}`}>
                        {p.source}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(p.updated_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-border/60">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No posts yet.</div>
          ) : (
            posts.map((p) => (
              <div
                key={p.id}
                className="px-4 py-3.5 space-y-2 cursor-pointer"
                onClick={() => navigate(`/admin/posts/${p.id}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-foreground truncate">{p.title}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${statusVariant(p.status)}`}>
                    {p.status}
                  </span>
                  <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${sourceVariant(p.source)}`}>
                    {p.source}
                  </span>
                  <span className="text-[11px] text-muted-foreground self-center">
                    {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
