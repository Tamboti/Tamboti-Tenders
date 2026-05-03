// Background enrichment worker.
// Picks pending tenders, fetches detail pages (source-specific),
// runs an AI summary via Lovable AI Gateway, and updates the row.
//
// Invoke with optional body: { batchSize?: number, source?: "zambia" | "tanzania" | "undp" }

import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CONFIG = {
  scrapeDoToken: Deno.env.get("SCRAPE_DO_TOKEN") ?? "",
  lovableApiKey: Deno.env.get("LOVABLE_API_KEY") ?? "",
  nestUsername: Deno.env.get("NEST_USERNAME") ?? "",
  nestPassword: Deno.env.get("NEST_PASSWORD") ?? "",
  defaultBatchSize: 10,
  maxAttempts: 3,
  concurrency: 3,
  detailDelayMs: 600,
  requestTimeoutMs: 25_000,
};

const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: "error", msg, ...meta })),
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ──────────────── Fetch helpers ────────────────
async function fetchViaProxy(url: string): Promise<string> {
  if (!CONFIG.scrapeDoToken) throw new Error("Missing SCRAPE_DO_TOKEN");
  const proxyUrl = `https://api.scrape.do?token=${CONFIG.scrapeDoToken}&url=${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ──────────────── Source-specific detail extractors ────────────────

interface DetailUpdate {
  description?: string | null;
  category?: string | null;
  procurement_type?: string | null;
  publication_date?: string | null;
  location_region?: string | null;
  location_district?: string | null;
  contract_duration_days?: number | null;
}

// Zambia
function parseZppaDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = "00", mi = "00"] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00Z`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function enrichZambia(sourceUrl: string): Promise<DetailUpdate> {
  await delay(CONFIG.detailDelayMs);
  const html = await fetchViaProxy(sourceUrl);
  const $ = cheerio.load(html);
  const fields: Record<string, string> = {};
  $("dl.Grid dt").each((_, dt) => {
    const key = $(dt).text().replace(/\u00a0/g, " ").replace(/\s+/g, " ").replace(/:/g, "").trim();
    const value = $(dt).next("dd").text().replace(/\s+/g, " ").trim();
    if (key) fields[key] = value;
  });
  return {
    description: fields["Description"] ?? null,
    category: fields["Procurement Type"] ?? null,
    procurement_type: fields["Procurement Type"] ?? null,
    publication_date: parseZppaDate(fields["Date of Publication/Invitation"]),
  };
}

// UNDP
async function enrichUndp(sourceUrl: string): Promise<DetailUpdate> {
  await delay(CONFIG.detailDelayMs);
  const html = await fetchViaProxy(sourceUrl);
  const $ = cheerio.load(html);
  const description =
    $(".description, #description, [class*='description']").first().text().replace(/\s+/g, " ").trim() ||
    $("p").filter((_, el) => $(el).text().length > 120).first().text().replace(/\s+/g, " ").trim() ||
    null;
  return { description };
}

// Tanzania (NEST GraphQL)
let nestTokenCache: { token: string; expiresAt: number } | null = null;

async function getNestToken(): Promise<string> {
  if (nestTokenCache && nestTokenCache.expiresAt > Date.now() + 30_000) {
    return nestTokenCache.token;
  }
  const body = new URLSearchParams({
    username: CONFIG.nestUsername,
    password: CONFIG.nestPassword,
    grant_type: "password",
  });
  const res = await fetch("https://nest.go.tz/gateway/nest-uaa/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "Authorization": "Basic bmVzdDoxa3p3anoybnplZ3QzbmVzdEBwcHJhLmdvLnR6YTFxQEJtTTBPbw==",
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`NEST auth failed: ${res.status}`);
  const data = await res.json();
  nestTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

const ENTITY_QUERY = `
  query getProcuringEntityDetailsByUuid($uuid: String) {
    getProcuringEntityDetailsByUuid(uuid: $uuid) {
      data { acronym physicalAddress phone postalAddress region { areaName } district { areaName } }
    }
  }
`;
const ADDITIONAL_DETAILS_QUERY = `
  query getEntityAdditionalDetailsByIdAndTypeCustom($entityId: Long, $entityType: EntityObjectTypeEnum) {
    getEntityAdditionalDetailsByIdAndTypeCustom(entityId: $entityId, entityType: $entityType) {
      data
    }
  }
`;

async function enrichTanzania(rawData: any): Promise<DetailUpdate> {
  if (!CONFIG.nestUsername || !CONFIG.nestPassword) {
    return { description: rawData?.descriptionOfTheProcurement ?? null };
  }
  const token = await getNestToken();

  const procuringEntityUuid = rawData?.procuringEntityUuid;
  const entityId = rawData?.entityId;
  const entityType = rawData?.entityType;

  let region: string | null = null;
  let district: string | null = null;
  let durationDays: number | null = null;

  if (procuringEntityUuid) {
    try {
      const res = await fetch("https://nest.go.tz/gateway/nest-uaa/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          operationName: "getProcuringEntityDetailsByUuid",
          query: ENTITY_QUERY,
          variables: { uuid: procuringEntityUuid },
        }),
      });
      const json = await res.json();
      const d = json?.data?.getProcuringEntityDetailsByUuid?.data;
      region = d?.region?.areaName ?? null;
      district = d?.district?.areaName ?? null;
    } catch (e) {
      log.warn("NEST entity fetch failed", { error: (e as Error).message });
    }
  }

  if (entityId && entityType) {
    try {
      const res = await fetch("https://nest.go.tz/gateway/nest-app/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          operationName: "getEntityAdditionalDetailsByIdAndTypeCustom",
          query: ADDITIONAL_DETAILS_QUERY,
          variables: { entityId, entityType },
        }),
      });
      const json = await res.json();
      const d = json?.data?.getEntityAdditionalDetailsByIdAndTypeCustom?.data;
      const dur = d?.contractDuration?.value;
      if (typeof dur === "string" && /^\d+$/.test(dur)) durationDays = parseInt(dur, 10);
    } catch (e) {
      log.warn("NEST additional details fetch failed", { error: (e as Error).message });
    }
  }

  return {
    description: rawData?.descriptionOfTheProcurement ?? null,
    location_region: region,
    location_district: district,
    contract_duration_days: durationDays,
  };
}

// ──────────────── AI summary ────────────────
async function aiSummarize(title: string, description: string | null, country: string | null): Promise<string | null> {
  if (!CONFIG.lovableApiKey) {
    log.warn("LOVABLE_API_KEY not set, skipping AI summary");
    return null;
  }
  const content = [
    `Country: ${country ?? "Unknown"}`,
    `Title: ${title}`,
    `Description: ${description ?? "(no description provided)"}`,
  ].join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CONFIG.lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a procurement analyst. Summarize tenders in 2-3 plain-English sentences. Highlight the scope, what is being procured, and any notable requirements. No marketing language.",
          },
          { role: "user", content },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      log.warn("AI gateway error", { status: res.status, body: txt.slice(0, 200) });
      return null;
    }
    const json = await res.json();
    return json?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    log.warn("AI summary failed", { error: (e as Error).message });
    return null;
  }
}

// ──────────────── Main worker ────────────────

async function pooledMap<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

interface TenderRecord {
  id: string;
  source: string;
  source_url: string | null;
  title: string;
  description: string | null;
  country: string | null;
  raw_data: any;
}

Deno.serve(async (req): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startMs = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let batchSize = CONFIG.defaultBatchSize;
  let sourceFilter: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.batchSize === "number") batchSize = Math.min(50, Math.max(1, body.batchSize));
    if (typeof body?.source === "string") sourceFilter = body.source;
  } catch { /* no body */ }

  try {
    let query = supabase
      .from("tenders")
      .select("id, source, source_url, title, description, country, raw_data")
      .eq("enrichment_status", "pending")
      .lt("enrichment_attempts", CONFIG.maxAttempts)
      .order("created_at", { ascending: true })
      .limit(batchSize);
    if (sourceFilter) query = query.eq("source", sourceFilter);

    const { data: pending, error } = await query;
    if (error) throw new Error(`Failed to fetch queue: ${error.message}`);
    const records = (pending ?? []) as TenderRecord[];

    if (records.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: "queue empty" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log.info("Enriching batch", { count: records.length });

    let enriched = 0;
    let failed = 0;

    await pooledMap(records, CONFIG.concurrency, async (r) => {
      try {
        let detail: DetailUpdate = {};
        if (r.source === "zambia" && r.source_url) {
          detail = await enrichZambia(r.source_url);
        } else if (r.source === "undp" && r.source_url) {
          detail = await enrichUndp(r.source_url);
        } else if (r.source === "tanzania") {
          detail = await enrichTanzania(r.raw_data);
        }

        const finalDescription = detail.description ?? r.description ?? null;
        const summary = await aiSummarize(r.title, finalDescription, r.country);

        const update: Record<string, unknown> = {
          enrichment_status: "enriched",
          enriched_at: new Date().toISOString(),
          enrichment_error: null,
          summary_en: summary,
        };
        if (detail.description !== undefined) update.description = detail.description;
        if (detail.category !== undefined && detail.category !== null) update.category = detail.category;
        if (detail.procurement_type !== undefined && detail.procurement_type !== null) update.procurement_type = detail.procurement_type;
        if (detail.publication_date) update.publication_date = detail.publication_date;
        if (detail.location_region !== undefined) update.location_region = detail.location_region;
        if (detail.location_district !== undefined) update.location_district = detail.location_district;
        if (detail.contract_duration_days !== undefined) update.contract_duration_days = detail.contract_duration_days;

        const { error: upErr } = await supabase.from("tenders").update(update).eq("id", r.id);
        if (upErr) throw new Error(upErr.message);
        enriched++;
      } catch (e) {
        failed++;
        const msg = (e as Error).message;
        log.warn("Enrichment failed", { id: r.id, source: r.source, error: msg });
        const { data: cur } = await supabase
          .from("tenders")
          .select("enrichment_attempts")
          .eq("id", r.id)
          .maybeSingle();
        const attempts = (cur?.enrichment_attempts ?? 0) + 1;
        const status = attempts >= CONFIG.maxAttempts ? "failed" : "pending";
        await supabase
          .from("tenders")
          .update({
            enrichment_attempts: attempts,
            enrichment_error: msg.slice(0, 500),
            enrichment_status: status,
          })
          .eq("id", r.id);
      }
    });

    const durationMs = Date.now() - startMs;
    return new Response(
      JSON.stringify({ success: true, processed: records.length, enriched, failed, duration_ms: durationMs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    log.error("Fatal", { error: (err as Error).message });
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
