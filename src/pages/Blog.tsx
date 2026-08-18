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
import { formatDate } from "@/lib/format";

type PostSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string;
  published_at: string | null;
};

/* ── Post card — same thin, bordered shell as TenderCard (see
   src/components/tender/TenderCard.tsx) for visual consistency between
   the two list-style pages. ── */
const PostCard = ({ post, onClick }: { post: PostSummary; onClick: () => void }) => (
  <motion.div
    variants={fadeUp}
    className="relative rounded-lg border border-border/70 bg-card p-4 shadow-sm cursor-pointer active:bg-muted/30 active:scale-[0.99] transition-all"
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
    }}
  >
    <div className="flex items-start gap-3">
      {post.cover_image_url && (
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
          <img src={post.cover_image_url} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
          {post.title}
        </p>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="inline-flex max-w-[9rem] rounded-full border border-border/70 bg-muted/35 px-2 py-0.5 text-[11px] font-semibold leading-none text-muted-foreground">
            <span className="truncate">{post.category}</span>
          </span>
          {post.published_at && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {formatDate(post.published_at)}
            </span>
          )}
        </div>

        {post.excerpt && (
          <p className="text-[11px] text-muted-foreground/75 line-clamp-2 mt-1">{post.excerpt}</p>
        )}
      </div>
    </div>
  </motion.div>
);

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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[92px] animate-pulse rounded-lg border border-border/70 bg-muted/40" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((post) => (
              <PostCard key={post.slug} post={post} onClick={() => navigate(`/blog/${post.slug}`)} />
            ))}
          </motion.div>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {activeCategory === "All"
              ? "No posts published yet — check back soon."
              : `No posts in "${activeCategory}" yet.`}
          </p>
        )}
      </div>
    </div>
  );
};

export default Blog;
