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

// Left accent bar + deadline-pill colors, indexed by urgency stage
// (0 = normal, 1 = closing within 7 days, 2 = closing within 2 days).
const STAGE_BAR = ["#d8dee8", "#E3A324", "#D64545"];
const STAGE_BADGE_BG = ["#eef1f6", "#FAEEDA", "#FCEBEB"];
const STAGE_BADGE_TEXT = ["#4b5563", "#8a5a12", "#a12626"];
const STAGE_BADGE_WEIGHT = [600, 700, 700];

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

// One tender's row inside the card, plus the hairline divider that follows
// it (skipped after the last row — see the bottom-padding bump there too).
const tenderRow = (t: MatchedTender, href: string, isLast: boolean) => {
  const title = escapeHtml(truncate(t.title, 100));
  const meta = [t.procuring_entity, t.country]
    .filter((v): v is string => Boolean(v))
    .map(escapeHtml)
    .join(" &nbsp;&middot;&nbsp; ");
  const days = daysLeftLabel(t.deadline);
  const stage = t.targetStage >= 0 && t.targetStage <= 2 ? t.targetStage : 0;
  const bar = STAGE_BAR[stage];
  const badgeBg = STAGE_BADGE_BG[stage];
  const badgeText = STAGE_BADGE_TEXT[stage];
  const badgeWeight = STAGE_BADGE_WEIGHT[stage];
  const bottomPad = isLast ? 32 : 24;

  return `
<tr>
<td class="px" style="padding:24px 32px ${bottomPad}px 32px;">
<a href="${href}" style="text-decoration:none; display:block;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="4" bgcolor="${bar}" style="background-color:${bar}; border-radius:3px; font-size:0; line-height:0;">&nbsp;</td>
<td width="16" style="font-size:0; line-height:0;">&nbsp;</td>
<td valign="top">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${t.isReminder ? `<tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6px;"><tr><td bgcolor="#eef1f6" style="background-color:#eef1f6; border-radius:4px; padding:2px 7px;"><span style="font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif; font-size:10.5px; font-weight:700; letter-spacing:0.05em; color:#6b7280; text-transform:uppercase;">Updated</span></td></tr></table></td></tr>` : ""}
<tr>
<td>
<p class="titleclamp text-main" style="margin:0 0 4px 0; font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif; font-size:16px; line-height:22px; font-weight:600; color:#0f172a;">
${title}
</p>
${meta ? `<p class="text-sub" style="margin:0; font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif; font-size:13px; line-height:19px; color:#6b7280;">${meta}</p>` : ""}
</td>
</tr>
${days ? `<tr><td style="padding-top:6px; line-height:0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${badgeBg}" style="background-color:${badgeBg}; border-radius:20px; padding:5px 12px; line-height:16px;"><span style="font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif; font-size:12px; font-weight:${badgeWeight}; color:${badgeText};">${days}</span></td></tr></table></td></tr>` : ""}
</table>
</td>
<td width="16" style="font-size:0; line-height:0;">&nbsp;</td>
<td width="14" valign="top" align="right" style="padding-top:2px;">
<span style="font-family:Georgia,serif; font-size:18px; color:#c3c9d2;">&rsaquo;</span>
</td>
</tr>
</table>
</a>
</td>
</tr>${!isLast ? `
<tr><td style="padding:0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #eef0f3; font-size:0; line-height:0;">&nbsp;</td></tr></table></td></tr>` : ""}`;
};

const buildHtml = (rows: MatchedTender[], pref: AlertPreference) => {
  const base = APP_URL.replace(/\/$/, "");
  const matchLabel = normalizeList(pref.categories).join(", ") || normalizeList(pref.countries).join(", ") || null;
  const subLine = matchLabel
    ? `Matching your alert for <strong style="color:#374151;">${escapeHtml(matchLabel)}</strong>`
    : "Matching your saved alert";
  const heading = buildSubject(rows.length);

  const closingCount = rows.filter((t) => t.targetStage >= 1).length;
  const preheader = escapeHtml(
    `${buildSubject(rows.length)}.${closingCount > 0 ? ` ${closingCount} closing within days.` : ""}${matchLabel ? ` ${matchLabel}.` : ""}`
  );

  const manageUrl = `${base}/alerts/${pref.id}`;
  const unsubscribeUrl = `${base}/alerts/${pref.id}/unsubscribe`;

  const rowsHtml = rows.map((t, i) => tenderRow(t, tenderHref(base, t), i === rows.length - 1)).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Tender Alert - Tamboti Tenders</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
  a { text-decoration: none; }
  .titleclamp { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .stack { display: block !important; width: 100% !important; }
    .px { padding-left: 20px !important; padding-right: 20px !important; }
  }
</style>
</head>
<body class="bg-outer" style="margin:0; padding:0; background-color:#ffffff; font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif;">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#ffffff; opacity:0;">
${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-outer" style="background-color:#ffffff;">
<tr>
<td align="center" style="padding:32px 16px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container" style="width:600px; max-width:600px;">

<!-- Header -->
<tr>
<td class="px" style="padding:0 8px 24px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="left" valign="middle">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:10px;">
<img src="https://gdbodrzxdbtskyzmqmuu.supabase.co/storage/v1/object/public/Company%20assets/d7d592e6-4c11-47a1-888d-f2c924958a69-removebg-preview.png" width="46" alt="Tamboti Tenders" style="display:block; width:46px; max-width:46px; height:auto;">
</td>
<td valign="middle">
<span style="font-family:Georgia,'Times New Roman',serif; font-size:17px; font-weight:400; color:#0f172a;">Tamboti Tenders</span>
</td>
</tr></table>
</td>
<td align="right" valign="middle">
<span class="text-sub" style="font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif; font-size:12px; color:#6b7280; letter-spacing:0.06em; text-transform:uppercase;">Tender Alert</span>
</td>
</tr>
</table>
</td>
</tr>

<!-- Card wrapper -->
<tr>
<td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-card" style="background-color:#ffffff; border:1px solid #e5e9f0; border-radius:16px;">

<!-- Intro -->
<tr>
<td class="px" style="padding:32px 32px 8px 32px;">
<p class="text-main" style="margin:0; font-family:Georgia,'Times New Roman',serif; font-size:24px; line-height:31px; font-weight:400; color:#0f172a;">
${heading}
</p>
</td>
</tr>
<tr>
<td class="px" style="padding:0 32px 24px 32px;">
<p class="text-sub" style="margin:0; font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif; font-size:14px; line-height:21px; color:#6b7280;">
${subLine}
</p>
</td>
</tr>

<!-- divider -->
<tr>
<td style="padding:0 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #eef0f3; font-size:0; line-height:0;">&nbsp;</td></tr></table>
</td>
</tr>
${rowsHtml}

</table>
</td>
</tr>

<!-- CTA -->
<tr>
<td align="center" style="padding:32px 8px 8px 8px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center" bgcolor="#0056D2" style="background-color:#0056D2; border-radius:10px;">
<a href="${base}/tenders" style="display:block; padding:14px 32px; font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif; font-size:15px; font-weight:600; color:#ffffff;">View all matches</a>
</td>
</tr>
</table>
</td>
</tr>

<!-- Footer -->
<tr>
<td align="center" style="padding:32px 24px 8px 24px;">
<p style="margin:0 0 12px 0; font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif; font-size:12px; line-height:18px; color:#98a1b0;">
<a href="${manageUrl}" style="color:#6b7280; text-decoration:underline;">Manage alerts</a>
&nbsp;&nbsp;&middot;&nbsp;&nbsp;
<a href="${unsubscribeUrl}" style="color:#6b7280; text-decoration:underline;">Unsubscribe</a>
</p>
<p style="margin:0; font-family:Inter,-apple-system,'Segoe UI',Arial,sans-serif; font-size:11px; line-height:17px; color:#b3b9c4;">
Tamboti Tenders &nbsp;&middot;&nbsp; 14 Samora Machel Ave, Harare, Zimbabwe<br>
You're receiving this because you saved a tender alert.
</p>
</td>
</tr>

</table>
</td>
</tr>
</table>

</body>
</html>`;
};

const buildText = (rows: MatchedTender[], pref: AlertPreference) => {
  const base = APP_URL.replace(/\/$/, "");
  const lines = rows.map((t) =>
    [
      `- ${t.title}${t.isReminder ? " (updated)" : ""}`,
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
