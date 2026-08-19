// Admin-only user lookup: the searchable list behind the "Users" admin tab,
// plus per-user Stripe payment history on demand. Two actions in one
// function since they're always used together and both need the same
// admin gate + service-role client.
//
// POST body: { action: "list" } | { action: "history", userId: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "npm:stripe@17.4.0";
import { requireAdmin } from "../_shared/requireAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const denied = await requireAdmin(req, service);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));

  if (body?.action === "history") {
    const userId = body?.userId;
    if (typeof userId !== "string" || !userId) return json(400, { error: "userId is required" });

    const { data: customer } = await service
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!customer?.stripe_customer_id) return json(200, { payments: [] });
    if (!STRIPE_SECRET_KEY) return json(500, { error: "Stripe not configured" });

    try {
      const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" });
      const invoices = await stripe.invoices.list({
        customer: customer.stripe_customer_id,
        limit: 24,
        status: "paid",
      });
      const payments = invoices.data.map((inv) => ({
        id: inv.id,
        amountUsd: inv.amount_paid / 100,
        currency: inv.currency,
        status: inv.status,
        createdAt: new Date(inv.created * 1000).toISOString(),
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        invoicePdf: inv.invoice_pdf ?? null,
        number: inv.number ?? null,
      }));
      return json(200, { payments });
    } catch (err) {
      return json(500, { error: (err as Error).message });
    }
  }

  // action === "list" (default)
  const { data: profiles, error: profErr } = await service
    .from("user_profiles")
    .select("id, role, full_name, created_at")
    .order("created_at", { ascending: false });
  if (profErr) return json(500, { error: profErr.message });

  const { data: authData, error: authErr } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) return json(500, { error: authErr.message });
  const emailById = new Map(authData.users.map((u) => [u.id, u.email ?? null]));

  const { data: subs, error: subErr } = await service
    .from("subscriptions")
    .select("user_id, status, current_period_end");
  if (subErr) return json(500, { error: subErr.message });
  const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s]));

  const users = (profiles ?? []).map((p) => {
    const sub = subByUser.get(p.id) as { status: string; current_period_end: string | null } | undefined;
    return {
      id: p.id,
      email: emailById.get(p.id) ?? null,
      fullName: p.full_name ?? null,
      role: p.role,
      createdAt: p.created_at,
      subscriptionStatus: sub?.status ?? "inactive",
      currentPeriodEnd: sub?.current_period_end ?? null,
    };
  });

  return json(200, { users });
});
