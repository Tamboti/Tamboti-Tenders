// Bot-facing HTML for blog posts and tender detail pages.
//
// The main app is a client-rendered React SPA — real visitors get it via
// index.html and it fills in via JS. Crawlers that don't execute JS (most of
// them: Bing, social-preview bots, AI answer engines) would otherwise only
// ever see an empty <div id="root">. vercel.json rewrites requests from
// known bot user agents on /blog/:slug and /tender/:id to this function
// instead, which renders the same title/description/content server-side as
// plain HTML. Everyone else still gets the normal SPA at the same URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Same secret used by the sitemap function — set once via
// `supabase secrets set APP_URL=...`, shared across functions.
const APP_URL = (Deno.env.get("APP_URL") ?? "http://localhost:8080").replace(/\/$/, "");
const SITE_NAME = "Tamboti Tenders";
const DEFAULT_IMAGE =
  "https://gdbodrzxdbtskyzmqmuu.supabase.co/storage/v1/object/public/Company%20assets/d7d592e6-4c11-47a1-888d-f2c924958a69-removebg-preview.png";

// Tenders whose deadline passed this long ago stop being worth a crawl
// budget — the page still resolves (it's real history), it just asks bots
// not to index it. Tune freely; this is a judgment call, not a hard rule.
const STALE_TENDER_DAYS = 60;

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

// Mirrors src/lib/textFormat.ts's paragraph-recovery logic for scraped
// tender text, minus the DOM-based entity decode (no `document` in Deno).
const toParagraphHtml = (text: string): string => {
  const trimmed = decodeEntities(text).trim();
  if (!trimmed) return "";

  const existing = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const paragraphs =
    existing.length > 1
      ? existing
      : (() => {
          const sentences = trimmed
            .split(/(?<=[.?!])\s+(?=[A-Z0-9])/)
            .map((s) => s.trim())
            .filter(Boolean);
          if (sentences.length <= 3) return [trimmed];
          const out: string[] = [];
          for (let i = 0; i < sentences.length; i += 3) out.push(sentences.slice(i, i + 3).join(" "));
          return out;
        })();

  return paragraphs.map((p) => `<p>${esc(p)}</p>`).join("\n");
};

const formatDate = (val: string | null) =>
  val
    ? new Date(val).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

const page = (opts: {
  title: string;
  description: string;
  canonical: string;
  image: string;
  type: "article";
  jsonLd: Record<string, unknown>;
  bodyHtml: string;
  noIndex?: boolean;
  status?: number;
}) => {
  const fullTitle = `${opts.title} - ${SITE_NAME}`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(opts.description)}">
${opts.noIndex ? '<meta name="robots" content="noindex, follow">' : ""}
<link rel="canonical" href="${esc(opts.canonical)}">
<meta property="og:type" content="${opts.type}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(opts.description)}">
<meta property="og:image" content="${esc(opts.image)}">
<meta property="og:url" content="${esc(opts.canonical)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(opts.description)}">
<meta name="twitter:image" content="${esc(opts.image)}">
<script type="application/ld+json">${JSON.stringify(opts.jsonLd).replace(/</g, "\\u003c")}</script>
</head>
<body>
${opts.bodyHtml}
</body>
</html>`;
  return new Response(html, {
    status: opts.status ?? 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
};

const notFound = (canonical: string) =>
  page({
    title: "Page not found",
    description: "This page may have been removed or the link is incorrect.",
    canonical,
    image: DEFAULT_IMAGE,
    type: "article",
    jsonLd: {},
    bodyHtml: `<p>This page may have been removed or the link is incorrect.</p><p><a href="${APP_URL}">${esc(SITE_NAME)}</a></p>`,
    noIndex: true,
    status: 404,
  });

async function renderBlogPost(supabase: ReturnType<typeof createClient>, slug: string) {
  const canonical = `${APP_URL}/blog/${encodeURIComponent(slug)}`;
  const { data: post } = await supabase
    .from("posts")
    .select("title, excerpt, cover_image_url, content_html, category, seo_title, seo_description, published_at, updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) return notFound(canonical);

  const title = post.seo_title ?? post.title;
  const description = post.seo_description ?? post.excerpt ?? `${post.category} insight from ${SITE_NAME}.`;
  const image = post.cover_image_url ?? DEFAULT_IMAGE;
  const publishedLabel = formatDate(post.published_at);

  const bodyHtml = `
<article>
  <p><a href="${APP_URL}/blog">${esc(SITE_NAME)} Blog</a></p>
  <p>${esc(post.category)}${publishedLabel ? ` &middot; ${esc(publishedLabel)}` : ""}</p>
  <h1>${esc(post.title)}</h1>
  ${post.cover_image_url ? `<img src="${esc(post.cover_image_url)}" alt="">` : ""}
  ${post.content_html}
</article>`;

  return page({
    title,
    description,
    canonical,
    image,
    type: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description,
      image,
      datePublished: post.published_at ?? undefined,
      dateModified: post.updated_at ?? post.published_at ?? undefined,
      author: { "@type": "Organization", name: SITE_NAME },
      publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: DEFAULT_IMAGE } },
      mainEntityOfPage: canonical,
    },
    bodyHtml,
  });
}

async function renderTender(supabase: ReturnType<typeof createClient>, id: string) {
  const canonical = `${APP_URL}/tender/${encodeURIComponent(id)}`;
  const { data: tender } = await supabase
    .from("tenders")
    .select(
      "title, title_en, description, description_en, summary_en, procuring_entity, country, category, " +
        "procurement_type, deadline, publication_date, estimated_value_usd, original_currency, updated_at, source_url"
    )
    .eq("id", id)
    .maybeSingle();

  if (!tender) return notFound(canonical);

  const title = tender.title_en ?? tender.title;
  const bodyText = tender.description_en ?? tender.description ?? tender.summary_en ?? "";
  const description = (tender.summary_en ?? bodyText).slice(0, 300) || `Procurement tender: ${title}`;

  const deadlineDate = tender.deadline ? new Date(tender.deadline) : null;
  const isStale =
    !!deadlineDate && Date.now() - deadlineDate.getTime() > STALE_TENDER_DAYS * 24 * 60 * 60 * 1000;

  const metaRows: string[] = [];
  if (tender.procuring_entity) metaRows.push(`<li><strong>Procuring entity:</strong> ${esc(tender.procuring_entity)}</li>`);
  if (tender.country) metaRows.push(`<li><strong>Country:</strong> ${esc(tender.country)}</li>`);
  if (tender.category) metaRows.push(`<li><strong>Category:</strong> ${esc(tender.category)}</li>`);
  if (tender.procurement_type) metaRows.push(`<li><strong>Procurement type:</strong> ${esc(tender.procurement_type)}</li>`);
  const deadlineLabel = formatDate(tender.deadline);
  if (deadlineLabel) metaRows.push(`<li><strong>Deadline:</strong> ${esc(deadlineLabel)}</li>`);
  if (tender.estimated_value_usd != null) {
    metaRows.push(
      `<li><strong>Estimated value:</strong> ${esc(
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: tender.original_currency ?? "USD",
          maximumFractionDigits: 0,
        }).format(tender.estimated_value_usd)
      )}</li>`
    );
  }

  const bodyHtml = `
<article>
  <p><a href="${APP_URL}/tenders">${esc(SITE_NAME)} - Browse tenders</a></p>
  <h1>${esc(title)}</h1>
  <ul>
    ${metaRows.join("\n    ")}
  </ul>
  ${toParagraphHtml(bodyText)}
  ${tender.source_url ? `<p><a href="${esc(tender.source_url)}" rel="nofollow noopener">Original source</a></p>` : ""}
</article>`;

  return page({
    title,
    description,
    canonical,
    image: DEFAULT_IMAGE,
    type: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      datePublished: tender.publication_date ?? undefined,
      dateModified: tender.updated_at ?? undefined,
      author: { "@type": "Organization", name: SITE_NAME },
      publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: DEFAULT_IMAGE } },
      mainEntityOfPage: canonical,
    },
    bodyHtml,
    noIndex: isStale,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "";

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const blogMatch = path.match(/^\/blog\/([^/]+)\/?$/);
  if (blogMatch) return renderBlogPost(supabase, decodeURIComponent(blogMatch[1]));

  const tenderMatch = path.match(/^\/tender\/([^/]+)\/?$/);
  if (tenderMatch) return renderTender(supabase, decodeURIComponent(tenderMatch[1]));

  return new Response("Not found", { status: 404, headers: corsHeaders });
});
