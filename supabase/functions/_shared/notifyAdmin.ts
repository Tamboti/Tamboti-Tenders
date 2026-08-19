// Classifies scrape.do / AI-gateway failures as ordinary vs. quota-or-credit
// exhaustion, and emails every admin when it's the latter — throttled so a
// multi-day outage sends one email per issue, not one per failed request.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ALERTS_FROM_EMAIL = Deno.env.get("ALERTS_FROM_EMAIL") ?? "alerts@tambotitenders.com";

// How long to wait before re-sending the same notification.
const COOLDOWN_HOURS = 24;

// Thrown by fetchViaProxy-style helpers so the status code survives up to
// wherever the error actually gets handled and classified.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const classify = (status: number, message: string): { isQuota: boolean; reason: string } => {
  const lower = message.toLowerCase();
  const flagged = status === 402 || status === 429 || /quota|credit|insufficient|limit exceeded/.test(lower);
  if (!flagged) return { isQuota: false, reason: "" };
  const reason = status === 402 || lower.includes("credit") ? "out of credits" : "rate limited / quota exceeded";
  return { isQuota: true, reason };
};

async function getAdminEmails(service: SupabaseClient): Promise<string[]> {
  const { data: admins } = await service.from("user_profiles").select("id").eq("role", "admin");
  const adminIds = new Set((admins ?? []).map((a: { id: string }) => a.id));
  if (adminIds.size === 0) return [];
  const { data, error } = await service.auth.admin.listUsers({ perPage: 200 });
  if (error || !data) return [];
  return data.users.filter((u) => adminIds.has(u.id) && u.email).map((u) => u.email as string);
}

async function sendEmail(to: string[], subject: string, text: string) {
  if (!RESEND_API_KEY || to.length === 0) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: ALERTS_FROM_EMAIL, to, subject, text }),
  });
  if (!res.ok) {
    console.error(JSON.stringify({
      level: "error",
      msg: "notifyAdmin: Resend failed",
      status: res.status,
      body: (await res.text()).slice(0, 200),
    }));
  }
}

// Call this wherever a scrape.do or AI-gateway request fails. Always
// returns a usable error-message string (quota issue or not), so callers
// can use the result for their thrown Error / scrape_logs row either way.
export async function reportExternalServiceError(
  service: SupabaseClient,
  opts: { key: string; service: string; context: string; error: unknown },
): Promise<string> {
  const err = opts.error;
  if (!(err instanceof HttpError)) {
    return err instanceof Error ? err.message : String(err);
  }

  const { isQuota, reason } = classify(err.status, err.message);
  if (!isQuota) return err.message;

  const summary = `${opts.service}: ${reason} (${opts.context})`;

  const { data: last } = await service
    .from("admin_notifications")
    .select("last_sent_at")
    .eq("key", opts.key)
    .maybeSingle();
  if (last?.last_sent_at) {
    const hoursSince = (Date.now() - new Date(last.last_sent_at).getTime()) / 3_600_000;
    if (hoursSince < COOLDOWN_HOURS) return summary;
  }

  const emails = await getAdminEmails(service);
  await sendEmail(
    emails,
    `Action needed: ${opts.service} ${reason}`,
    `${opts.context} hit a ${opts.service} failure that looks like ${reason}.\n\n` +
      `This will keep failing until it's resolved (top up credits, or wait for the quota to reset).\n\n` +
      `Details: HTTP ${err.status} - ${err.message.slice(0, 300)}`,
  );

  await service
    .from("admin_notifications")
    .upsert({ key: opts.key, last_sent_at: new Date().toISOString() }, { onConflict: "key" });

  return summary;
}
