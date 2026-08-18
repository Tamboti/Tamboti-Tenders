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

// A tender matched to an alert, annotated with why it's being sent: brand
// new, or a reminder because its deadline has moved into a closer window.
type MatchedTender = TenderRow & {
  isReminder: boolean;
  targetStage: number;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:8080";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ALERTS_FROM_EMAIL = Deno.env.get("ALERTS_FROM_EMAIL") ?? "alerts@tambotitenders.com";

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
  count === 1 ? "1 tender needs your attention" : `${count} tenders need your attention`;

// Server-side truncation so long titles look right in every email client,
// regardless of that client's text-overflow/ellipsis support.
const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

// Reminder tiers: a tender is re-sent once its deadline crosses into a
// closer window than the stage it was last sent at. Ordered closest-first
// so the first match wins.
const REMINDER_STAGES: { maxDaysLeft: number; stage: number }[] = [
  { maxDaysLeft: 2, stage: 2 },
  { maxDaysLeft: 7, stage: 1 },
];

const daysLeft = (deadline: string | null): number | null => {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
};

// The urgency stage a tender belongs in right now, based on days left.
// Tenders with no deadline always stay at stage 0 (sent once, never reminded).
const stageFor = (deadline: string | null): number => {
  const d = daysLeft(deadline);
  if (d === null) return 0;
  for (const { maxDaysLeft, stage } of REMINDER_STAGES) {
    if (d <= maxDaysLeft) return stage;
  }
  return 0;
};

const daysLeftLabel = (deadline: string | null) => {
  const d = daysLeft(deadline);
  if (d === null) return null;
  if (d < 0) return null;
  if (d === 0) return "Due today";
  return `${d}d left`;
};

// Badge color escalates with urgency stage so reminders are visually
// distinct from a first-time match without needing extra copy.
const badgeStyle = (stage: number) => {
  if (stage === 2) return "background:#FCEBEB;color:#791F1F;";
  if (stage === 1) return "background:#FAEEDA;color:#854F0B;";
  return "color:#0056D2;";
};

// Mirrors src/lib/slug.ts — kept in sync by hand since Deno functions can't
// import from src/.
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const tenderHref = (base: string, t: { id: string; title: string }) => {
  const slug = slugify(t.title ?? "");
  return slug ? `${base}/tender/${t.id}/${slug}` : `${base}/tender/${t.id}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const buildHtml = (rows: MatchedTender[], pref: AlertPreference) => {
  const base = APP_URL.replace(/\/$/, "");
  const matchLabel = normalizeList(pref.categories).join(" and ") ||
    normalizeList(pref.countries).join(", ") ||
    "your alert";

  const cards = rows
    .map((t) => {
      const href = tenderHref(base, t);
      const title = escapeHtml(truncate(t.title, 60));
      const metaParts = [t.procuring_entity, t.country].filter(Boolean);
      if (t.isReminder) metaParts.push("Reminder — still open");
      const meta = metaParts.join(" &middot; ");
      const days = daysLeftLabel(t.deadline);
      const badge = badgeStyle(t.targetStage);
      return `<a href="${href}" style="display:block;text-decoration:none;border:0.5px solid #eceef1;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <div style="font-weight:500;font-size:14px;color:#111318;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
          ${days ? `<div style="flex-shrink:0;font-size:11.5px;font-weight:500;padding:3px 8px;border-radius:20px;${badge}">${days}</div>` : ""}
        </div>
        ${meta ? `<div style="margin-top:4px;font-size:12.5px;color:#9199a6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(meta)}</div>` : ""}
      </a>`;
    })
    .join("");

  const manageUrl = `${base}/alerts/${pref.id}`;
  const unsubscribeUrl = `${base}/alerts/${pref.id}/unsubscribe`;

  return `
  <div style="font-family:Inter,-apple-system,Segoe UI,sans-serif;background:#ffffff;max-width:520px;margin:0 auto;">
    <div style="padding:28px 28px 0;">
      <div style="display:flex;align-items:center;gap:8px;">
        <img src="https://gdbodrzxdbtskyzmqmuu.supabase.co/storage/v1/object/public/Company%20assets/d7d592e6-4c11-47a1-888d-f2c924958a69-removebg-preview.png" alt="Tamboti Tenders" width="24" height="24" style="height:24px;width:24px;max-width:24px;display:block;border:0;outline:none;" />
        <span style="font-size:14px;font-weight:600;color:#111318;letter-spacing:-0.01em;">Tamboti Tenders</span>
      </div>
    </div>

    <div style="padding:20px 28px 4px;">
      <div style="font-size:19px;font-weight:600;color:#111318;letter-spacing:-0.01em;">${rows.length} ${rows.length === 1 ? "tender" : "tenders"}</div>
      <div style="margin-top:4px;font-size:14px;color:#6b7280;">${escapeHtml(matchLabel)}</div>
    </div>

    <div style="padding:16px 28px 8px;">
      ${cards}
    </div>

    <div style="padding:12px 28px 28px;">
      <a href="${base}/tenders" style="display:block;text-align:center;background:#0056D2;color:#ffffff;font-size:14px;font-weight:500;padding:12px;border-radius:8px;text-decoration:none;">View all matches</a>
    </div>

    <div style="border-top:0.5px solid #eceef1;padding:16px 28px;font-size:11.5px;color:#9199a6;line-height:1.6;">
      Sent by Tamboti Tenders &middot;
      <a href="${manageUrl}" style="color:#6b7280;text-decoration:none;">Manage alerts</a> &middot;
      <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:none;">Unsubscribe</a>
    </div>
  </div>`;
};

const buildText = (rows: MatchedTender[], pref: AlertPreference) => {
  const base = APP_URL.replace(/\/$/, "");
  const lines = rows.map((t) =>
    [
      `- ${t.title}${t.isReminder ? " (reminder, still open)" : ""}`,
      t.country ? `  Country: ${t.country}` : null,
      t.category ? `  Category: ${t.category}` : null,
      t.deadline ? `  Deadline: ${new Date(t.deadline).toLocaleDateString()}` : null,
      `  Link: ${tenderHref(base, t)}`,
    ].filter(Boolean).join("\n")
  );
  return `Tamboti Tenders alert\n\n${rows.length} ${rows.length === 1 ? "tender" : "tenders"} matching your alert.\n\n${lines.join("\n\n")}\n\nManage alerts: ${base}/alerts/${pref.id}\nUnsubscribe: ${base}/alerts/${pref.id}/unsubscribe`;
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
): Promise<MatchedTender[]> {
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

  rows = rows.slice(0, 50);

  if (testMode) {
    // Test sends preview everything currently matching, unannotated.
    return rows.map((r) => ({ ...r, isReminder: false, targetStage: stageFor(r.deadline) }));
  }

  if (rows.length === 0) return [];

  // Look up what's already been sent for this alert, and at what urgency
  // stage. A tender is included again only if its current stage is closer
  // (higher) than the stage it was last sent at.
  const ids = rows.map((r) => r.id);
  const { data: sentRows, error: sentErr } = await supabase
    .from("alert_sent_tenders")
    .select("tender_id, reminder_stage")
    .eq("alert_preference_id", pref.id)
    .in("tender_id", ids);
  if (sentErr) throw new Error(sentErr.message);
  const sentStages = new Map<string, number>(
    (sentRows ?? []).map((r: { tender_id: string; reminder_stage: number }) => [r.tender_id, r.reminder_stage]),
  );

  const matched: MatchedTender[] = [];
  for (const r of rows) {
    const targetStage = stageFor(r.deadline);
    const priorStage = sentStages.get(r.id);
    if (priorStage === undefined) {
      matched.push({ ...r, isReminder: false, targetStage });
    } else if (targetStage > priorStage) {
      matched.push({ ...r, isReminder: true, targetStage });
    }
    // else: already sent at this urgency or higher — skip.
  }

  return matched;
}

async function recordSent(
  supabase: ReturnType<typeof createClient>,
  prefId: string,
  matched: MatchedTender[],
) {
  if (matched.length === 0) return;
  const now = new Date().toISOString();
  const payload = matched.map((t) => ({
    alert_preference_id: prefId,
    tender_id: t.id,
    reminder_stage: t.targetStage,
    sent_at: now,
  }));
  const { error } = await supabase
    .from("alert_sent_tenders")
    .upsert(payload, { onConflict: "alert_preference_id,tender_id" });
  if (error) console.error("recordSent failed", { prefId, error: error.message });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // Everything below can throw (a missing secret, a network failure calling
  // Resend, etc.) — without this wrapper an uncaught exception escapes as a
  // bare "Internal Server Error" with no CORS headers, which the browser's
  // fetch can't even read (blocked as a CORS failure before the frontend
  // sees the real message). Always resolve to a well-formed JSON response.
  try {
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

      await sendEmail(
        pref.emails,
        `[Test] ${buildSubject(rows.length)}`,
        buildHtml(rows, pref as AlertPreference),
        buildText(rows, pref as AlertPreference),
      );
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
          await sendEmail(pref.emails, buildSubject(rows.length), buildHtml(rows, pref), buildText(rows, pref));
          await recordSent(service, pref.id, rows);
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
  } catch (err) {
    console.error("send-alert-digest fatal", { error: (err as Error).message });
    return json(500, { error: (err as Error).message });
  }
});
