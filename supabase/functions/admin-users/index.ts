// The two pieces of the "Users" admin tab that genuinely need service-role
// access — everything else (user_profiles, subscriptions) is a direct
// client-side query from Users.tsx, same as Sources/Analytics, since
// admin_read_policies.sql already gives admins RLS read access to those
// tables. What's left here is only what RLS can't cover at all:
//   - emails live in auth.users, which the client SDK can never read
//     regardless of RLS — needs the Auth Admin API.
//   - Stripe payment history needs the Stripe secret key.
//
// POST body: { action: "emails" } | { action: "history", userId: string }
//   | { action: "setRole", userId: string, role: "admin" | "member" }

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

  if (body?.action === "setRole") {
    const userId = body?.userId;
    const role = body?.role;
    if (typeof userId !== "string" || !userId) return json(400, { error: "userId is required" });
    if (role !== "admin" && role !== "member") return json(400, { error: "role must be 'admin' or 'member'" });

    // Don't let an admin lock themselves out — demotion of your own account is blocked.
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: callerData } = await anon.auth.getUser();
    if (role === "member" && callerData?.user?.id === userId) {
      return json(400, { error: "You can't remove your own admin access" });
    }

    const { error } = await service.from("user_profiles").update({ role }).eq("id", userId);
    if (error) return json(500, { error: error.message });
    return json(200, { success: true });
  }

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

  // action === "emails" (default) — id -> email for every user, the one
  // thing the client genuinely cannot fetch itself.
  const { data: authData, error: authErr } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (authErr) return json(500, { error: authErr.message });

  const emails: Record<string, string | null> = {};
  for (const u of authData.users) emails[u.id] = u.email ?? null;

  return json(200, { emails });
});
