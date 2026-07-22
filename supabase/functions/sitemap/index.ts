// Public sitemap.xml — no auth required. Static routes plus every published
// blog post (tender detail pages are excluded: deadlines churn constantly,
// posts are the durable SEO content).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Never guess a production domain — this must be set as an edge function
// secret once one is chosen. Falls back to localhost so this is obviously
// wrong (not silently pointing at someone else's domain) if unset.
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:8080";

const STATIC_ROUTES = ["/", "/tenders", "/blog"];

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: posts } = await supabase
    .from("posts")
    .select("slug, updated_at")
    .eq("status", "published");

  const staticUrls = STATIC_ROUTES.map(
    (path) => `  <url><loc>${xmlEscape(APP_URL + path)}</loc></url>`
  );
  const postUrls = (posts ?? []).map(
    (p) =>
      `  <url><loc>${xmlEscape(APP_URL + "/blog/" + p.slug)}</loc><lastmod>${
        new Date(p.updated_at).toISOString().slice(0, 10)
      }</lastmod></url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...postUrls].join("\n")}\n</urlset>\n`;

  return new Response(xml, {
    headers: { ...corsHeaders, "Content-Type": "application/xml" },
  });
});
