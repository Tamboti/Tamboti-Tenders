import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { handleDbError } from "@/lib/dbError";
import { Seo } from "@/components/seo/Seo";

type PostSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
};

const Blog = () => {
  const navigate = useNavigate();

  const postsQuery = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("slug, title, excerpt, cover_image_url, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw new Error(handleDbError(error));
      return (data ?? []) as PostSummary[];
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Seo
        title="Blog"
        description="Procurement market trends and tender insights across Africa."
        url={typeof window !== "undefined" ? window.location.origin + "/blog" : undefined}
      />

      <div className="mb-10 space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Blog</h1>
        <p className="text-sm text-muted-foreground">
          Procurement market trends and tender insights across Africa.
        </p>
      </div>

      {postsQuery.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      ) : postsQuery.data && postsQuery.data.length > 0 ? (
        <div className="space-y-4">
          {postsQuery.data.map((post) => (
            <button
              key={post.slug}
              type="button"
              onClick={() => navigate(`/blog/${post.slug}`)}
              className="flex w-full gap-4 rounded-xl border border-border/70 bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/30"
            >
              {post.cover_image_url && (
                <img
                  src={post.cover_image_url}
                  alt=""
                  className="h-20 w-28 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 space-y-1">
                <h2 className="font-semibold text-foreground line-clamp-1">{post.title}</h2>
                {post.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                )}
                {post.published_at && (
                  <p className="text-xs text-muted-foreground/70">
                    {new Date(post.published_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">No posts published yet — check back soon.</p>
      )}
    </div>
  );
};

export default Blog;
