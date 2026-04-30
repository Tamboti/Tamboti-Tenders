// Tanzania (NEST) tender scraper
// Fetches published tenders from nest.go.tz, enriches with entity + additional details,
// upserts into the unified `tenders` table, and writes a `scrape_logs` entry.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ─────────────────── CORS ─────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─────────────────── CONFIG ───────────────────
const CONFIG = {
  authUrl: "https://nest.go.tz/gateway/nest-uaa",
  appUrl: "https://nest.go.tz/gateway/nest-app",
  basicToken: "Basic bmVzdDoxa3p3anoybnplZ3QzbmVzdEBwcHJhLmdvLnR6YTFxQEJtTTBPbw==",
  username: Deno.env.get("NEST_USERNAME") ?? "",
  password: Deno.env.get("NEST_PASSWORD") ?? "",
  pageSize: 10,
  concurrency: 3,
  retryBaseDelayMs: 2000,
  maxRetries: 3,
  source: "tanzania",
} as const;

// ─────────────────── TYPES ────────────────────
interface TenderRow {
  uuid: string;
  entityId: number;
  referenceNumber: string;
  descriptionOfTheProcurement: string;
  entityType: string;
  entitySubCategoryName: string;
  procurementCategoryName: string;
  invitationDate: string;
  submissionOrOpeningDate: string;
  lotCount: number;
  hasAddendum: boolean;
  eligibleTypes: string;
  procuringEntityName: string;
  procuringEntityUuid: string;
  financialYearCode: string;
  entityStatus: string;
}

interface EntityDetail {
  acronym: string;
  physicalAddress: string;
  phone: string;
  postalAddress: string;
  region: string | null;
  district: string | null;
}

interface AdditionalDetails {
  [k: string]: unknown;
}

interface TenderResult extends TenderRow {
  entity: EntityDetail | null;
  additionalDetails: AdditionalDetails | null;
  scrapedAt: string;
}

// ─────────────────── LOGGER ───────────────────
const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", msg, ...meta })),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: "error", msg, ...meta })),
};

// ─────────────────── HELPERS ──────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pluck(data: Record<string, any>, key: string): any {
  return data?.[key]?.value ?? null;
}

async function withRetry<T>(fn: () => Promise<T>, attempt = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (attempt <= CONFIG.maxRetries) {
      const backoff = CONFIG.retryBaseDelayMs * 2 ** (attempt - 1);
      log.info("Retrying", { attempt, backoff });
      await delay(backoff);
      return withRetry(fn, attempt + 1);
    }
    throw err;
  }
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

// ─────────────────── AUTH ─────────────────────
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

// ─────────────────── GQL ──────────────────────
async function gql<T>(
  token: string,
  operationName: string,
  query: string,
  variables: Record<string, unknown>,
  endpoint: string = CONFIG.appUrl,
): Promise<T> {
  return withRetry(async () => {
    const res = await fetch(`${endpoint}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ operationName, query, variables }),
    });
    if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    return json.data as T;
  });
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

const ENTITY_QUERY = `
  query getProcuringEntityDetailsByUuid($uuid: String) {
    getProcuringEntityDetailsByUuid(uuid: $uuid) {
      data {
        acronym physicalAddress phone postalAddress
        region { areaName __typename }
        district { areaName __typename }
      }
    }
  }
`;

const ADDITIONAL_DETAILS_QUERY = `
  query getEntityAdditionalDetailsByIdAndTypeCustom($entityId: Long, $entityType: EntityObjectTypeEnum) {
    getEntityAdditionalDetailsByIdAndTypeCustom(entityId: $entityId, entityType: $entityType) {
      code status message data __typename
    }
  }
`;

async function fetchTenders(token: string): Promise<TenderRow[]> {
  const data = await gql<any>(token, "getPublishedEntityViewData", TENDERS_QUERY, {
    withMetaData: false,
    input: {
      page: 1,
      pageSize: CONFIG.pageSize,
      fields: [{ fieldName: "invitationDate", isSortable: true, orderDirection: "DESC" }],
      mustHaveFilters: [{ fieldName: "entityStatus", operation: "IN", inValues: ["PUBLISHED"] }],
    },
  });
  return data.items.rows as TenderRow[];
}

async function fetchEntityDetail(token: string, uuid: string): Promise<EntityDetail | null> {
  try {
    await delay(150);
    const data = await gql<any>(
      token, "getProcuringEntityDetailsByUuid",
      ENTITY_QUERY, { uuid }, CONFIG.authUrl,
    );
    const d = data.getProcuringEntityDetailsByUuid?.data;
    if (!d) return null;
    return {
      acronym: d.acronym,
      physicalAddress: d.physicalAddress,
      phone: d.phone,
      postalAddress: d.postalAddress,
      region: d.region?.areaName ?? null,
      district: d.district?.areaName ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchAdditionalDetails(
  token: string,
  entityId: number,
  entityType: string,
): Promise<AdditionalDetails | null> {
  try {
    await delay(150);
    const data = await gql<any>(
      token, "getEntityAdditionalDetailsByIdAndTypeCustom",
      ADDITIONAL_DETAILS_QUERY, { entityId, entityType },
    );
    const d = data.getEntityAdditionalDetailsByIdAndTypeCustom?.data;
    if (!d) return null;
    const keys = [
      "projectName", "locationOfTheSite", "deliveryLocation", "contractDuration",
      "deliveryPeriod", "contractStartDate", "tenderValidityPeriod", "tenderSecurityType",
      "percentOfPerformanceSecurity", "fixationPrice", "tenderCurrencyType",
      "advancePaymentApplicability", "liquidatedDamagesPercent",
      "warrantyPeriodAfterDeliveryAndAcceptance", "preQualificationHasBeenConducted",
      "postQualification", "jvcaApplicable", "domesticPreferenceApplicability",
      "alternativeTenders", "contactPersonAddress", "governingLaw", "placeForArbitration",
    ];
    const out: AdditionalDetails = {};
    for (const k of keys) out[k] = pluck(d, k);
    return out;
  } catch {
    return null;
  }
}

// ─────────── Map to unified tender row ───────────
function toTenderRow(r: TenderResult) {
  const region = r.entity?.region ?? null;
  const district = r.entity?.district ?? null;
  const ad = r.additionalDetails ?? {};
  const durationStr = (ad as any).contractDuration as string | null;
  const durationDays = durationStr && /^\d+$/.test(durationStr)
    ? parseInt(durationStr, 10)
    : null;

  return {
    source: CONFIG.source,
    source_id: r.uuid,
    source_url: `https://nest.go.tz/portal/tender/${r.uuid}`,
    reference_number: r.referenceNumber ?? null,
    title: r.descriptionOfTheProcurement || r.referenceNumber || "Untitled tender",
    description: r.descriptionOfTheProcurement ?? null,
    procuring_entity: r.procuringEntityName ?? null,
    country: "Tanzania",
    category: r.procurementCategoryName ?? null,
    procurement_type: r.entitySubCategoryName ?? null,
    deadline: r.submissionOrOpeningDate ? new Date(r.submissionOrOpeningDate).toISOString() : null,
    publication_date: r.invitationDate ? new Date(r.invitationDate).toISOString() : null,
    lot_count: r.lotCount ?? null,
    location_region: region,
    location_district: district,
    contract_duration_days: durationDays,
    scraped_at: r.scrapedAt,
    raw_data: r as unknown as Record<string, unknown>,
  };
}

// ─────────────────── HANDLER ──────────────────
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
    if (!CONFIG.username || !CONFIG.password) {
      throw new Error("Missing NEST_USERNAME / NEST_PASSWORD secrets");
    }

    log.info("NEST scrape started");
    const token = await getAccessToken();
    const tenders = await fetchTenders(token);
    recordsFound = tenders.length;
    log.info("Tenders fetched", { count: tenders.length });

    const results = await pooledMap(tenders, CONFIG.concurrency, async (t): Promise<TenderResult> => {
      const [entity, additionalDetails] = await Promise.all([
        fetchEntityDetail(token, t.procuringEntityUuid),
        fetchAdditionalDetails(token, t.entityId, t.entityType),
      ]);
      return { ...t, entity, additionalDetails, scrapedAt: new Date().toISOString() };
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
    await supabase.from("scrape_logs").insert({
      source: CONFIG.source,
      status: "success",
      records_found: recordsFound,
      records_inserted: recordsInserted,
      duration_ms: durationMs,
    });

    return new Response(
      JSON.stringify({
        success: true,
        records_found: recordsFound,
        records_inserted: recordsInserted,
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
