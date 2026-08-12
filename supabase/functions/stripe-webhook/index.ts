// Receives Stripe webhook events and upserts billing_customers/subscriptions
// via the service-role client. Live: create-checkout-session and the
// Billing/Pricing pages both depend on this being correct.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@17.4.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

const log = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", msg, ...meta })),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", msg, ...meta })),
};

const mapStripeStatus = (status: Stripe.Subscription.Status): string => {
  if (status === "active" || status === "trialing" || status === "past_due" || status === "canceled") {
    return status;
  }
  // incomplete, incomplete_expired, unpaid, paused — collapse to inactive.
  return "inactive";
};

// Stripe moved current_period_end/start off the top-level Subscription
// object onto each subscription item in a later API version than the one
// this client is pinned to (2024-11-20.acacia) — but webhook payloads are
// sent in whatever API version the Stripe account/endpoint is configured
// for, independent of what our outgoing client requests. Reading only
// sub.current_period_end silently produced `undefined`, and
// `new Date(undefined * 1000).toISOString()` throws RangeError: Invalid
// time value, which is why every subscription.created/updated event was
// 500ing. Check both locations so this works regardless of account version.
const getCurrentPeriodEnd = (sub: Stripe.Subscription): string | null => {
  const itemLevel = (sub.items.data[0] as unknown as { current_period_end?: number })?.current_period_end;
  const topLevel = (sub as unknown as { current_period_end?: number }).current_period_end;
  const epochSeconds = itemLevel ?? topLevel;
  return typeof epochSeconds === "number" ? new Date(epochSeconds * 1000).toISOString() : null;
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" });
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Missing stripe-signature header");
    event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    log.warn("Signature verification failed", { error: (err as Error).message });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.user_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (userId && customerId) {
          const { error } = await supabase
            .from("billing_customers")
            .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: "user_id" });
          if (error) throw new Error(error.message);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const { data: customer } = await supabase
          .from("billing_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (customer) {
          const { error } = await supabase.from("subscriptions").upsert(
            {
              user_id: customer.user_id,
              stripe_subscription_id: sub.id,
              stripe_price_id: sub.items.data[0]?.price?.id ?? null,
              status: mapStripeStatus(sub.status),
              current_period_end: getCurrentPeriodEnd(sub),
            },
            { onConflict: "stripe_subscription_id" },
          );
          if (error) throw new Error(error.message);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id);
        if (error) throw new Error(error.message);
        break;
      }

      default:
        log.info("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log.warn("Webhook handling failed", { type: event.type, error: (err as Error).message });
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
