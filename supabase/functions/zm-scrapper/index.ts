// Zambia (ZPPA) tender scraper
// Scrapes eprocure.zppa.org.zm via scrape.do, upserts into the unified `tenders` table,
// and writes a `scrape_logs` entry.

import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ─────────────── CORS ───────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─────────────── CONFIG ───────────────
const CONFIG = {
  baseUrl: "https://eprocure.zppa.org.zm",
  scrapeDoToken: Deno.env.get("SCRAPE_DO_TOKEN") ?? "",
  concurrency: 5,
  detailDelayMs: 600,
  listDelayMs: 300,
  maxRetries: 3,
  retryBaseDelayMs: 2000,
  requestTimeoutMs: 20_000,
  source: "zambia",
} as const;

// ─────────────── TYPES ───────────────
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

interface TenderDetail {
  description: string | null;
  procurementType: string | null;
  procedure: string | null;
  evaluationMechanism: string | null;
  paymentType: string | null;
  paymentAmount: string | null;
  bidSecurityType: string | null;
  submissionDeadline: string | null;
  clarificationDeadline: string | null;
  bidOpeningDate: string | null;
  publicationDate: string | null;
  unspscCodes: string | null;
  tenderUniqueId: string | null;
  appReference: string | null;
}

interface TenderResult extends TenderRow {
  detail: TenderDetail | null;
  scrapedAt: string;
  error?: string;
}

// ─────────────── LOGGER ───────────────
const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: "error", msg, ...meta })),
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─────────────── FETCH ───────────────
async function fetchViaProxy(url: string, attempt = 1): Promise<string> {
  const proxyUrl =
    `https://api.scrape.do?token=${CONFIG.scrapeDoToken}&url=${encodeURIComponent(url)}`;

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
      log.warn("Fetch retry", { url, attempt, backoff, error: (err as Error).message });
      await delay(backoff);
      return fetchViaProxy(url, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────── HELPERS ───────────────
function cleanKey(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").replace(/:/g, "").trim();
}

function parseDlGrid($: cheerio.CheerioAPI): Record<string, string> {
  const data: Record<string, string> = {};
  $("dl.Grid dt").each((_, dt) => {
    const key = cleanKey($(dt).text());
    const value = $(dt).next("dd").text().replace(/\s+/g, " ").trim();
    if (key) data[key] = value;
  });
  return data;
}

async function pooledMap<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// ─────────────── SCRAPERS ───────────────
async function scrapeDetail(tender: TenderRow): Promise<TenderDetail | null> {
  await delay(CONFIG.detailDelayMs);
  const html = await fetchViaProxy(tender.link);
  const $ = cheerio.load(html);
  const f = parseDlGrid($);
  return {
    description: f["Description"] ?? null,
    procurementType: f["Procurement Type"] ?? null,
    procedure: f["Procedure"] ?? null,
    evaluationMechanism: f["Evaluation Mechanism"] ?? null,
    paymentType: f["Payment Type"] ?? null,
    paymentAmount: f["Payment Amount (ZMW)"] ?? f["Payment Amount"] ?? null,
    bidSecurityType: f["Bid Security Type"] ?? null,
    submissionDeadline: f["Deadline for Bid Submission"] ?? null,
    clarificationDeadline: f["End of Clarification Period"] ?? null,
    bidOpeningDate: f["Bid Opening Date"] ?? null,
    publicationDate: f["Date of Publication/Invitation"] ?? null,
    unspscCodes: f["UNSPSC Codes"] ?? null,
    tenderUniqueId: f["Tender Unique ID"] ?? null,
    appReference: f["APP Reference Number"] ?? null,
  };
}

async function scrapeList(): Promise<TenderRow[]> {
  await delay(CONFIG.listDelayMs);
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

// ─────────── Date parsing ───────────
// ZPPA dates look like "12/05/2026 14:30" (dd/MM/yyyy HH:mm)
function parseZppaDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = "00", mi = "00"] = m;
  const iso = `${yyyy}-${mm}-${dd}T${hh}:${mi}:00Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toTenderRow(r: TenderResult) {
  const d = r.detail;
  return {
    source: CONFIG.source,
    source_id: r.resourceId,
    source_url: r.link,
    reference_number: r.number || d?.appReference || null,
    title: r.title || "Untitled tender",
    description: d?.description ?? null,
    procuring_entity: r.entity ?? null,
    country: "Zambia",
    category: d?.procurementType ?? null,
    procurement_type: d?.procurementType ?? null,
    deadline: parseZppaDate(d?.submissionDeadline) ?? parseZppaDate(r.deadline),
    publication_date: parseZppaDate(d?.publicationDate),
    workflow_status: "New",
    original_currency: "ZMW",
    scraped_at: r.scrapedAt,
    raw_data: r as unknown as Record<string, unknown>,
  };
}

// ─────────────── HANDLER ───────────────
Deno.serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startMs = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let recordsFound = 0;
  let recordsInserted = 0;

  try {
    if (!CONFIG.scrapeDoToken) {
      throw new Error("Missing SCRAPE_DO_TOKEN secret");
    }

    log.info("ZPPA scrape started");
    const tenders = await scrapeList();
    recordsFound = tenders.length;
    log.info("List scraped", { count: tenders.length });

    const results = await pooledMap(tenders, CONFIG.concurrency, async (t): Promise<TenderResult> => {
      try {
        const detail = await scrapeDetail(t);
        return { ...t, detail, scrapedAt: new Date().toISOString() };
      } catch (err) {
        return { ...t, detail: null, scrapedAt: new Date().toISOString(), error: (err as Error).message };
      }
    });

    const rows = results.map(toTenderRow);
    if (rows.length > 0) {
      const { error: upErr, count } = await supabase
        .from("tenders")
        .upsert(rows, { onConflict: "source,source_id", count: "exact" });
      if (upErr) throw new Error(`Upsert failed: ${upErr.message}`);
      recordsInserted = count ?? rows.length;
    }

    const durationMs = Date.now() - startMs;
    const failed = results.filter((r) => !r.detail).length;

    await supabase.from("scrape_logs").insert({
      source: CONFIG.source,
      status: failed === results.length && results.length > 0 ? "error" : "success",
      records_found: recordsFound,
      records_inserted: recordsInserted,
      duration_ms: durationMs,
      error_message: failed > 0 ? `${failed} detail fetches failed` : null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        records_found: recordsFound,
        records_inserted: recordsInserted,
        failed,
        duration_ms: durationMs,
      }),
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

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
