import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";
import { ArrowLeft } from "@/components/icons";
import { trackEvent } from "@/lib/analytics";

type Post = {
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  content_html: string;
  category: string;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
};

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    supabase
      .from("posts")
      .select("title, excerpt, cover_image_url, content_html, category, seo_title, seo_description, published_at")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
      .then(({ data }) => {
        setPost(data as Post | null);
        setLoading(false);
        if (data) trackEvent("view_blog_post", { slug });
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 space-y-4">
        <div className="h-8 w-2/3 animate-pulse rounded bg-muted/50" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-muted/50" />
        <div className="h-64 w-full animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <p className="text-base font-semibold text-foreground">Post not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This post may have been unpublished or the link is incorrect.
        </p>
        <Link
          to="/blog"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to blog
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8"
    >
      <Seo
        title={post.seo_title ?? post.title}
        description={post.seo_description ?? post.excerpt ?? undefined}
        image={post.cover_image_url ?? undefined}
        url={typeof window !== "undefined" ? window.location.href : undefined}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.seo_description ?? post.excerpt ?? undefined,
          image: post.cover_image_url ?? undefined,
          datePublished: post.published_at ?? undefined,
          author: { "@type": "Organization", name: "Tamboti Tenders" },
          publisher: { "@type": "Organization", name: "Tamboti Tenders" },
          mainEntityOfPage: typeof window !== "undefined" ? window.location.href : undefined,
        }}
      />

      <Link
        to="/blog"
        className="group mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Blog
      </Link>

      <article className="space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{post.category}</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{post.title}</h1>
          {post.published_at && (
            <p className="text-sm text-muted-foreground">
              {new Date(post.published_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </header>

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt=""
            className="w-full rounded-xl border border-border/70 object-cover"
          />
        )}

        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content_html }}
        />
      </article>
    </motion.div>
  );
};

export default BlogPost;
