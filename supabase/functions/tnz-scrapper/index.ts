// Tanzania (NEST) tender scraper — LIST ONLY
// Fetches the published tender list via GraphQL and upserts minimal rows.
// Detail enrichment (entity details, additional details, AI summary) is handled by `enrich-tenders`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CONFIG = {
  authUrl: "https://nest.go.tz/gateway/nest-uaa",
  appUrl: "https://nest.go.tz/gateway/nest-app",
  basicToken: "Basic bmVzdDoxa3p3anoybnplZ3QzbmVzdEBwcHJhLmdvLnR6YTFxQEJtTTBPbw==",
  username: Deno.env.get("NEST_USERNAME") ?? "",
  password: Deno.env.get("NEST_PASSWORD") ?? "",
  pageSize: 50,
  retryBaseDelayMs: 2000,
  maxRetries: 3,
  source: "tanzania",
} as const;

interface TenderRow {
  uuid: string;
  entityId: number;
  entityType: string;
  referenceNumber: string;
  descriptionOfTheProcurement: string;
  entitySubCategoryName: string;
  procurementCategoryName: string;
  invitationDate: string;
  submissionOrOpeningDate: string;
  lotCount: number;
  procuringEntityName: string;
  procuringEntityUuid: string;
}

const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: "error", msg, ...meta })),
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (attempt <= CONFIG.maxRetries) {
      const backoff = CONFIG.retryBaseDelayMs * 2 ** (attempt - 1);
      await delay(backoff);
      return withRetry(fn, attempt + 1);
    }
    throw err;
  }
}

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    username: CONFIG.username,
    password: CONFIG.password,
    grant_type: "password",
  });
  const res = await fetch(`${CONFIG.authUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "Authorization": CONFIG.basicToken,
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

const TENDERS_QUERY = `
  query getPublishedEntityViewData($input: DataRequestInputInput, $withMetaData: Boolean) {
    items: getPublishedEntityViewData(input: $input, withMetaData: $withMetaData) {
      totalPages totalRecords currentPage hasNext
      rows: data {
        descriptionOfTheProcurement
        entityId entityNumber entityStatus
        entitySubCategoryName entityType
        uuid: entityUuid entityUuid
        financialYearCode lotCount hasAddendum
        eligibleTypes procurementCategoryName
        procuringEntityName procuringEntityUuid
        submissionOrOpeningDate invitationDate
        referenceNumber __typename
      }
    }
  }
`;

async function fetchTenderPage(token: string, page: number): Promise<{
  rows: TenderRow[];
  hasNext: boolean;
  totalPages: number;
}> {
  return withRetry(async () => {
    const res = await fetch(`${CONFIG.appUrl}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        operationName: "getPublishedEntityViewData",
        query: TENDERS_QUERY,
        variables: {
          withMetaData: false,
          input: {
            page,
            pageSize: CONFIG.pageSize,
            fields: [{ fieldName: "invitationDate", isSortable: true, orderDirection: "DESC" }],
            mustHaveFilters: [{ fieldName: "entityStatus", operation: "IN", inValues: ["PUBLISHED"] }],
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    return {
      rows: json.data.items.rows as TenderRow[],
      hasNext: json.data.items.hasNext as boolean,
      totalPages: json.data.items.totalPages as number,
    };
  });
}

function toTenderRow(r: TenderRow) {
  return {
    source: CONFIG.source,
    source_id: r.uuid,
    source_url: `https://nest.go.tz/portal/tender/${r.uuid}`,
    reference_number: r.referenceNumber ?? null,
    title: r.descriptionOfTheProcurement || r.referenceNumber || "Untitled tender",
    procuring_entity: r.procuringEntityName ?? null,
    country: "Tanzania",
    category: r.procurementCategoryName ?? null,
    procurement_type: r.entitySubCategoryName ?? null,
    deadline: r.submissionOrOpeningDate ? new Date(r.submissionOrOpeningDate).toISOString() : null,
    publication_date: r.invitationDate ? new Date(r.invitationDate).toISOString() : null,
    lot_count: r.lotCount ?? null,
    workflow_status: "New",
    enrichment_status: "pending",
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

  let recordsFound = 0;
  let recordsInserted = 0;

  try {
    if (!CONFIG.username || !CONFIG.password) {
      throw new Error("Missing NEST_USERNAME / NEST_PASSWORD secrets");
    }

    let mode: "seed" | "new" = "new";
    try {
      const body = await req.json();
      if (body?.mode === "seed") mode = "seed";
    } catch { /* no body */ }

    log.info("NEST list scrape started", { mode });
    const token = await getAccessToken();

    // Load known IDs
    const { data: existing } = await supabase
      .from("tenders")
      .select("source_id")
      .eq("source", CONFIG.source);
    const knownIds = new Set((existing ?? []).map((r: { source_id: string }) => r.source_id));

    const newTenders: TenderRow[] = [];
    let page = 1;
    let stopEarly = false;

    while (!stopEarly) {
      const { rows, hasNext, totalPages } = await fetchTenderPage(token, page);
      log.info("Page fetched", { page, totalPages, rows: rows.length });

      for (const t of rows) {
        if (knownIds.has(t.uuid)) {
          if (mode === "new") { stopEarly = true; break; }
          continue;
        }
        newTenders.push(t);
        knownIds.add(t.uuid);
      }

      if (stopEarly || !hasNext || page >= totalPages) break;
      page++;
      await delay(200);
    }

    recordsFound = newTenders.length;
    log.info("New tenders found", { count: newTenders.length });

    if (newTenders.length > 0) {
      const rows = newTenders.map(toTenderRow);
      // upsert in chunks of 100
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error: upErr, count } = await supabase
          .from("tenders")
          .upsert(batch, { onConflict: "source,source_id", count: "exact" });
        if (upErr) throw new Error(`Upsert failed: ${upErr.message}`);
        recordsInserted += count ?? batch.length;
      }
    }

    const durationMs = Date.now() - startMs;
    await supabase.from("scrape_logs").insert({
      source: CONFIG.source,
      status: "success",
      records_found: recordsFound,
      records_inserted: recordsInserted,
      duration_ms: durationMs,
    });

    return new Response(
      JSON.stringify({ success: true, mode, records_found: recordsFound, records_inserted: recordsInserted, duration_ms: durationMs }),
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
