// Starts a Stripe Checkout session for the Pro plan (see pricing model:
// $19/mo or $190/yr — src/lib/plan.ts mirrors these numbers for UI copy
// only, this function and the Stripe dashboard are the source of truth for
// price). Reuses billing_customers/subscriptions written by stripe-webhook —
// this is the piece that was missing to make that groundwork reachable from
// the product.
//
// POST body: { interval?: "monthly" | "annual" }  (defaults to "monthly")
// Response:  { url: string }
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
const STRIPE_PRICE_ID_PRO_MONTHLY = Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY") ?? "";
const STRIPE_PRICE_ID_PRO_ANNUAL = Deno.env.get("STRIPE_PRICE_ID_PRO_ANNUAL") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "http://localhost:8080";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID_PRO_MONTHLY || !STRIPE_PRICE_ID_PRO_ANNUAL) {
    return json(500, { error: "Stripe not configured" });
  }

  let interval: "monthly" | "annual" = "monthly";
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.interval === "annual") interval = "annual";
  } catch {
    // no/invalid body — default to monthly
  }
  const priceId = interval === "annual" ? STRIPE_PRICE_ID_PRO_ANNUAL : STRIPE_PRICE_ID_PRO_MONTHLY;

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

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" });

  try {
    const { data: existingCustomer } = await service
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existingCustomer?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      const { error: upsertErr } = await service
        .from("billing_customers")
        .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
      if (upsertErr) throw new Error(upsertErr.message);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${APP_URL}/pricing?checkout=success`,
      cancel_url: `${APP_URL}/pricing?checkout=cancel`,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return json(200, { url: session.url });
  } catch (err) {
    const msg = (err as Error).message;
    log.warn("create-checkout-session failed", { user_id: user.id, error: msg });
    return json(500, { error: msg });
  }
});
