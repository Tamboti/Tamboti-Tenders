import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { handleDbError } from "@/lib/dbError";
import { Seo } from "@/components/seo/Seo";
import { cn } from "@/lib/utils";
import { POST_CATEGORIES } from "@/lib/blogCategories";
import { fadeUp, staggerContainer } from "@/lib/motion";

type PostSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  published_at: string | null;
};

const Blog = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const postsQuery = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("slug, title, excerpt, cover_image_url, category, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (error) throw new Error(handleDbError(error));
      return (data ?? []) as PostSummary[];
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const posts = postsQuery.data ?? [];
  const filtered = useMemo(
    () => (activeCategory === "All" ? posts : posts.filter((p) => p.category === activeCategory)),
    [posts, activeCategory]
  );

  return (
    <div className="">
      <Seo
        title="Blog"
        description="Procurement market trends and tender insights across Africa."
        url={typeof window !== "undefined" ? window.location.origin + "/blog" : undefined}
      />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-3xl px-4 pt-16 pb-10 text-center sm:px-6 lg:px-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Our blog</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Procurement market trends and tender insights across Africa
        </h1>

      </motion.div>

      {/* Category filter */}
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 px-4 pb-10 sm:px-6 lg:px-8">
        {["All", ...POST_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActiveCategory(c)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              activeCategory === c
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background text-foreground hover:bg-muted"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        {postsQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[4/3] animate-pulse rounded-xl bg-muted/60" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted/60" />
                <div className="h-5 w-4/5 animate-pulse rounded bg-muted/60" />
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((post) => (
              <motion.button
                key={post.slug}
                variants={fadeUp}
                type="button"
                onClick={() => navigate(`/blog/${post.slug}`)}
                className="group flex flex-col text-left"
              >
                <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
                  {post.cover_image_url ? (
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-muted to-muted/50" />
                  )}
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">
                  {post.category}
                </p>
                <h2 className="mt-1 text-lg font-bold leading-snug text-foreground line-clamp-2 group-hover:underline">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                )}
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {activeCategory === "All"
              ? "No posts published yet - check back soon."
              : `No posts in "${activeCategory}" yet.`}
          </p>
        )}
      </div>
    </div>
  );
};

export default Blog;
