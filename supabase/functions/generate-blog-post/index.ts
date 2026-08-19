// Admin-triggered blog post generation.
// Pulls an aggregate trend snapshot straight from the live `tenders` table
// (no external market-data source) and asks Gemini to write a post grounded
// only in those numbers. Always inserted as a draft — an admin must review
// and publish it from the CMS, this never auto-publishes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/requireAdmin.ts";
import { HttpError, reportExternalServiceError } from "../_shared/notifyAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";

const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
};

type ActiveTenderRow = {
  title: string;
  title_en: string | null;
  category: string | null;
  country: string | null;
  estimated_value_usd: number | null;
  created_at: string | null;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const topN = (rows: (string | null)[], n: number) => {
  const counts = new Map<string, number>();
  for (const v of rows) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }));
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const denied = await requireAdmin(req, supabase);
  if (denied) return denied;

  try {
    const nowIso = new Date().toISOString();
    const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAheadIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Africa-scoped, enriched, currently-open tenders — same default scope
    // used everywhere tenders are listed in the app.
    const activeQuery = supabase
      .from("tenders")
      .select("title, title_en, category, country, estimated_value_usd, created_at")
      .eq("enrichment_status", "enriched")
      .or("continent.eq.Africa,continent.is.null")
      .gte("deadline", nowIso)
      .limit(2000);

    const [{ data: activeRows, error: activeErr }, { count: closingSoonCount }] = await Promise.all([
      activeQuery,
      supabase
        .from("tenders")
        .select("id", { count: "exact", head: true })
        .eq("enrichment_status", "enriched")
        .or("continent.eq.Africa,continent.is.null")
        .gte("deadline", nowIso)
        .lte("deadline", sevenDaysAheadIso),
    ]);
    if (activeErr) throw new Error(activeErr.message);

    const rows = (activeRows ?? []) as ActiveTenderRow[];
    const newInLast7Days = rows.filter((r) => r.created_at && r.created_at >= sevenDaysAgoIso).length;

    const trendSnapshot = {
      generated_at: nowIso,
      total_active_tenders: rows.length,
      closing_within_7_days: closingSoonCount ?? 0,
      new_in_last_7_days: newInLast7Days,
      top_categories: topN(rows.map((r) => r.category), 8),
      top_countries: topN(rows.map((r) => r.country), 8),
      biggest_opportunities: rows
        .filter((r) => typeof r.estimated_value_usd === "number" && r.estimated_value_usd! > 0)
        .sort((a, b) => (b.estimated_value_usd ?? 0) - (a.estimated_value_usd ?? 0))
        .slice(0, 5)
        .map((r) => ({
          title: r.title_en ?? r.title,
          country: r.country,
          category: r.category,
          estimated_value_usd: r.estimated_value_usd,
        })),
    };

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt =
      "You are a procurement market analyst writing a blog post for Tamboti Tenders, a site that tracks African procurement tenders. " +
      "You are given a JSON snapshot of trend data pulled directly from the live tenders database. " +
      "Write a short, informative blog post grounded ONLY in the numbers provided — never invent statistics, " +
      "figures, or claims that aren't directly supported by the snapshot. If a number isn't in the snapshot, don't mention it. " +
      "Respond with a JSON object with exactly these keys: " +
      '"title" (string, no more than 70 characters), "excerpt" (string, 1-2 plain sentences), ' +
      '"content_html" (string, 3-5 short paragraphs of semantic HTML using <p>, <h2>, and <ul>/<li> tags only — no <html>/<body> wrapper, no inline styles).';

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(trendSnapshot) }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 2048, responseMimeType: "application/json" },
        }),
      },
    );

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      const message = await reportExternalServiceError(supabase, {
        key: "ai_credits",
        service: "Gemini",
        context: "Blog post generation (generate-blog-post)",
        error: new HttpError(aiRes.status, `HTTP ${aiRes.status}: ${txt.slice(0, 300)}`),
      });
      log.warn("Gemini error", { status: aiRes.status, body: txt.slice(0, 300) });
      throw new Error(message);
    }

    const aiJson = await aiRes.json();
    const cand = aiJson?.candidates?.[0];
    const raw = (cand?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "").trim();
    if (!raw) {
      throw new Error(
        `Gemini returned an empty response (finishReason=${cand?.finishReason ?? "none"})`,
      );
    }
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

    let parsed: { title: string; excerpt: string; content_html: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI response was not valid JSON");
    }
    if (!parsed.title || !parsed.content_html) {
      throw new Error("AI response missing required fields");
    }

    const baseSlug = slugify(parsed.title) || "tender-market-update";
    let slug = baseSlug;
    let attempt = 0;
    while (true) {
      const { data: existing } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      attempt++;
      slug = `${baseSlug}-${attempt + 1}`;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("posts")
      .insert({
        slug,
        title: parsed.title,
        excerpt: parsed.excerpt ?? null,
        content_html: parsed.content_html,
        status: "draft",
        source: "ai",
        category: "Market Trends",
        author_id: null,
        seo_title: parsed.title,
        seo_description: parsed.excerpt ?? null,
      })
      .select("id, slug")
      .single();
    if (insertErr) throw new Error(insertErr.message);

    log.info("Generated AI blog draft", { id: inserted.id, slug: inserted.slug });

    return new Response(JSON.stringify({ success: true, post: inserted, trend_snapshot: trendSnapshot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
