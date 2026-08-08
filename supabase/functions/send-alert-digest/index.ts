import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-alerts-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AlertPreference = {
  id: string;
  name: string;
  user_id: string;
  enabled: boolean;
  emails: string[];
  countries: string[];
  categories: string[];
  closing_soon_only: boolean;
  frequency: "daily" | "weekly";
  last_sent_at: string | null;
};

type TenderRow = {
  id: string;
  title: string;
  country: string | null;
  category: string | null;
  procuring_entity: string | null;
  deadline: string | null;
  source: string;
  created_at: string | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:8080";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ALERTS_FROM_EMAIL = Deno.env.get("ALERTS_FROM_EMAIL") ?? "alerts@tender-compass.local";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeList = (values: string[] | null | undefined) =>
  (values ?? []).map((v) => v.trim()).filter(Boolean);

const isDue = (pref: AlertPreference) => {
  if (!pref.last_sent_at) return true;
  const last = new Date(pref.last_sent_at).getTime();
  const now = Date.now();
  const ms = pref.frequency === "weekly" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return now - last >= ms;
};

const buildSubject = (count: number) =>
  count === 1 ? "Tamboti Tenders: 1 new tender match" : `Tamboti Tenders: ${count} new tender matches`;

const buildHtml = (rows: TenderRow[]) => {
  const list = rows
    .map((t) => {
      const href = `${APP_URL.replace(/\/$/, "")}/tender/${t.id}`;
      const meta = [
        t.country ? `Country: ${t.country}` : null,
        t.category ? `Category: ${t.category}` : null,
        t.procuring_entity ? `Entity: ${t.procuring_entity}` : null,
        t.deadline ? `Deadline: ${new Date(t.deadline).toLocaleDateString()}` : null,
        t.source ? `Source: ${t.source}` : null,
      ].filter(Boolean).join(" • ");
      return `<li style="margin:0 0 14px 0;">
        <a href="${href}" style="font-weight:600;color:#111827;text-decoration:none;">${t.title}</a>
        <div style="margin-top:4px;color:#4b5563;font-size:13px;">${meta}</div>
      </li>`;
    })
    .join("");

  return `
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.45;color:#111827;">
    <h2 style="margin:0 0 12px 0;">Tamboti Tenders alert</h2>
    <p style="margin:0 0 12px 0;">We found ${rows.length} new tender ${rows.length === 1 ? "match" : "matches"} for your alert preferences.</p>
    <ul style="padding-left:18px;margin:0;">${list}</ul>
  </div>`;
};

const buildText = (rows: TenderRow[]) => {
  const lines = rows.map((t) =>
    [
      `- ${t.title}`,
      t.country ? `  Country: ${t.country}` : null,
      t.category ? `  Category: ${t.category}` : null,
      t.deadline ? `  Deadline: ${new Date(t.deadline).toLocaleDateString()}` : null,
      `  Link: ${APP_URL.replace(/\/$/, "")}/tender/${t.id}`,
    ].filter(Boolean).join("\n")
  );
  return `Tamboti Tenders alert\n\nWe found ${rows.length} new ${rows.length === 1 ? "match" : "matches"}.\n\n${lines.join("\n\n")}`;
};

async function sendEmail(to: string[], subject: string, html: string, text: string) {
  if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: ALERTS_FROM_EMAIL, to, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

async function fetchMatchingTenders(
  supabase: ReturnType<typeof createClient>,
  pref: AlertPreference,
  testMode: boolean,
) {
  const countries = normalizeList(pref.countries);
  const categories = normalizeList(pref.categories);

  let query = supabase
    .from("tenders")
    .select("id,title,country,category,procuring_entity,deadline,source,created_at")
    .eq("enrichment_status", "enriched")
    .order("created_at", { ascending: false })
    .limit(100);

  if (countries.length > 0) query = query.in("country", countries);
  if (categories.length > 0) query = query.in("category", categories);

  // Skip tenders already past deadline (give 1h grace). Skip in test mode too — they're useless.
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  query = query.or(`deadline.is.null,deadline.gte.${cutoff}`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  let rows = (data ?? []) as TenderRow[];

  if (pref.closing_soon_only) {
    const now = Date.now();
    const in7 = now + 7 * 24 * 60 * 60 * 1000;
    rows = rows.filter((r) => {
      if (!r.deadline) return false;
      const ts = new Date(r.deadline).getTime();
      return ts >= now && ts <= in7;
    });
  }

  if (!testMode && rows.length > 0) {
    // Exclude tenders already emailed for this alert preference.
    const ids = rows.map((r) => r.id);
    const { data: sentRows, error: sentErr } = await supabase
      .from("alert_sent_tenders")
      .select("tender_id")
      .eq("alert_preference_id", pref.id)
      .in("tender_id", ids);
    if (sentErr) throw new Error(sentErr.message);
    const seen = new Set((sentRows ?? []).map((r: { tender_id: string }) => r.tender_id));
    rows = rows.filter((r) => !seen.has(r.id));
  }

  return rows.slice(0, 50);
}

async function recordSent(
  supabase: ReturnType<typeof createClient>,
  prefId: string,
  tenderIds: string[],
) {
  if (tenderIds.length === 0) return;
  const payload = tenderIds.map((tid) => ({ alert_preference_id: prefId, tender_id: tid }));
  const { error } = await supabase
    .from("alert_sent_tenders")
    .upsert(payload, { onConflict: "alert_preference_id,tender_id", ignoreDuplicates: true });
  if (error) console.error("recordSent failed", { prefId, error: error.message });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  const cronSecret = req.headers.get("x-alerts-cron-secret") ?? "";
  const body = await req.json().catch(() => ({}));
  const testMode = body?.mode === "test";
  const testAlertId = typeof body?.alertId === "string" ? body.alertId : null;

  const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // User-triggered test send: only their own preference.
  if (testMode) {
    if (!authHeader || !ANON_KEY) return json(401, { error: "Unauthorized" });
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData.user) return json(401, { error: "Unauthorized" });
    const uid = authData.user.id;

    if (!testAlertId) return json(400, { error: "Missing alertId for test mode" });
    const { data: pref, error: prefErr } = await service
      .from("alert_preferences")
      .select("*")
      .eq("user_id", uid)
      .eq("id", testAlertId)
      .maybeSingle();
    if (prefErr) return json(500, { error: prefErr.message });
    if (!pref) return json(404, { error: "No alert preferences found" });
    if (!pref.enabled) return json(400, { error: "Alerts are disabled" });
    if (!pref.emails?.length) return json(400, { error: "No recipient emails configured" });

    const rows = await fetchMatchingTenders(service, pref as AlertPreference, true);
    if (rows.length === 0) return json(200, { ok: true, sent: false, reason: "No matching tenders found" });

    await sendEmail(pref.emails, `[Test] ${buildSubject(rows.length)}`, buildHtml(rows), buildText(rows));
    return json(200, { ok: true, sent: true, matched: rows.length, alertId: pref.id });
  }

  // Scheduled run: verify shared cron secret from app_secrets table.
  const { data: secretRow, error: secretErr } = await service
    .from("app_secrets")
    .select("value")
    .eq("name", "alerts_cron_secret")
    .maybeSingle();
  if (secretErr || !secretRow?.value || cronSecret !== secretRow.value) {
    return json(401, { error: "Invalid cron secret" });
  }

  const { data: prefs, error } = await service
    .from("alert_preferences")
    .select("*")
    .eq("enabled", true);
  if (error) return json(500, { error: error.message });

  let processed = 0;
  let sent = 0;
  let totalTenders = 0;
  for (const pref of (prefs ?? []) as AlertPreference[]) {
    if (!isDue(pref)) continue;
    if (!pref.emails?.length) continue;
    processed++;
    try {
      const rows = await fetchMatchingTenders(service, pref, false);
      if (rows.length > 0) {
        await sendEmail(pref.emails, buildSubject(rows.length), buildHtml(rows), buildText(rows));
        await recordSent(service, pref.id, rows.map((r) => r.id));
        sent++;
        totalTenders += rows.length;
      }
      await service
        .from("alert_preferences")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("id", pref.id);
    } catch (e) {
      console.error("send-alert-digest error", { prefId: pref.id, error: (e as Error).message });
    }
  }

  return json(200, { ok: true, processed, sent, tenders: totalTenders });
});
