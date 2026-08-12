// Returns the signed-in user's Stripe payment history. There's no local
// invoices table — Stripe is the source of truth for what was actually
// charged, so this reads straight from the Stripe API rather than trying to
// keep a local copy in sync via more webhook events.
//
// POST body: {} (none needed)
// Response:  { payments: Array<{ id, amountUsd, status, createdAt, hostedInvoiceUrl, invoicePdf, number }> }
//
// Auth: any signed-in user (JWT in Authorization header).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@17.4.0?target=deno";

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

  if (!STRIPE_SECRET_KEY) return json(500, { error: "Stripe not configured" });

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return json(401, { error: "Unauthorized" });

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );
  const { data: userData, error: userErr } = await anon.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
  const user = userData.user;

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: customer } = await service
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!customer?.stripe_customer_id) {
    return json(200, { payments: [] });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" });

  try {
    const invoices = await stripe.invoices.list({
      customer: customer.stripe_customer_id,
      limit: 12,
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
    const msg = (err as Error).message;
    console.warn(JSON.stringify({ level: "warn", msg: "billing-history failed", user_id: user.id, error: msg }));
    return json(500, { error: msg });
  }
});
