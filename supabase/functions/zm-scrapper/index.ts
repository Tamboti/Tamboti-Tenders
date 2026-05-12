// Zambia (ZPPA) tender scraper — LIST ONLY
// Fetches the index page and upserts minimal tender rows.
// Detail pages, descriptions, and AI summaries are handled by `enrich-tenders`.

import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/requireAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CONFIG = {
  baseUrl: "https://eprocure.zppa.org.zm",
  scrapeDoToken: Deno.env.get("SCRAPE_DO_TOKEN") ?? "",
  maxRetries: 3,
  retryBaseDelayMs: 2000,
  requestTimeoutMs: 25_000,
  source: "zambia",
} as const;

const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: "error", msg, ...meta })),
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchViaProxy(url: string, attempt = 1): Promise<string> {
  const proxyUrl = `https://api.scrape.do?token=${CONFIG.scrapeDoToken}&url=${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
  try {
    const res = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ZPPABot/1.0)" },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return await res.text();
  } catch (err) {
    if (attempt <= CONFIG.maxRetries) {
      const backoff = CONFIG.retryBaseDelayMs * 2 ** (attempt - 1);
      log.warn("Fetch retry", { attempt, backoff, error: (err as Error).message });
      await delay(backoff);
      return fetchViaProxy(url, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

interface TenderRow {
  number: string;
  title: string;
  entity: string;
  deadline: string;
  procedure: string;
  status: string;
  link: string;
  resourceId: string;
}

function parseZppaDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = "00", mi = "00"] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00Z`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function scrapeList(): Promise<TenderRow[]> {
  const listUrl =
    `${CONFIG.baseUrl}/epps/quickSearchAction.do?searchSelect=6` +
    `&selectedItem=quickSearchAction.do%3FsearchSelect%3D6`;
  const html = await fetchViaProxy(listUrl);
  const $ = cheerio.load(html);
  const tenders: TenderRow[] = [];

  $("table#T01 tbody tr").each((_, el) => {
    const row = $(el).find("td");
    if (row.length < 5) return;
    const href = $(row[1]).find("a").attr("href") ?? "";
    const resourceId = href.match(/resourceId=(\d+)/)?.[1];
    if (!resourceId) return;
    tenders.push({
      number: $(row[0]).text().trim(),
      title: $(row[1]).text().trim(),
      entity: $(row[2]).text().trim(),
      deadline: $(row[4]).text().trim(),
      procedure: $(row[5]).text().trim(),
      status: $(row[6]).text().trim(),
      link: CONFIG.baseUrl + href,
      resourceId,
    });
  });

  return tenders;
}

function toTenderRow(r: TenderRow) {
  return {
    source: CONFIG.source,
    source_id: r.resourceId,
    source_url: r.link,
    reference_number: r.number || null,
    title: r.title || "Untitled tender",
    procuring_entity: r.entity ?? null,
    country: "Zambia",
    procurement_type: r.procedure || null,
    deadline: parseZppaDate(r.deadline),
    workflow_status: "New",
    enrichment_status: "pending",
    original_currency: "ZMW",
    scraped_at: new Date().toISOString(),
    raw_data: r as unknown as Record<string, unknown>,
  };
}

Deno.serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startMs = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const denied = await requireAdmin(req, supabase);
  if (denied) return denied;

  let recordsFound = 0;
  let recordsInserted = 0;

  try {
    if (!CONFIG.scrapeDoToken) throw new Error("Missing SCRAPE_DO_TOKEN secret");

    log.info("ZPPA list scrape started");
    const tenders = await scrapeList();
    recordsFound = tenders.length;
    log.info("List scraped", { count: tenders.length });

    // Only insert NEW tenders (preserve enrichment_status of existing ones)
    const { data: existing } = await supabase
      .from("tenders")
      .select("source_id")
      .eq("source", CONFIG.source);
    const known = new Set((existing ?? []).map((r: { source_id: string }) => r.source_id));

    const rows = tenders.filter((t) => !known.has(t.resourceId)).map(toTenderRow);

    if (rows.length > 0) {
      const { error: upErr, count } = await supabase
        .from("tenders")
        .upsert(rows, { onConflict: "source,source_id", count: "exact" });
      if (upErr) throw new Error(`Upsert failed: ${upErr.message}`);
      recordsInserted = count ?? rows.length;
    }

    const durationMs = Date.now() - startMs;
    await supabase.from("scrape_logs").insert({
      source: CONFIG.source,
      status: "success",
      records_found: recordsFound,
      records_inserted: recordsInserted,
      duration_ms: durationMs,
      error_message: null,
    });

    return new Response(
      JSON.stringify({ success: true, records_found: recordsFound, records_inserted: recordsInserted, duration_ms: durationMs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = (err as Error).message;
    const durationMs = Date.now() - startMs;
    log.error("Fatal error", { error: message });
    try {
      await supabase.from("scrape_logs").insert({
        source: CONFIG.source,
        status: "error",
        records_found: recordsFound,
        records_inserted: recordsInserted,
        duration_ms: durationMs,
        error_message: message,
      });
    } catch { /* ignore */ }
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
