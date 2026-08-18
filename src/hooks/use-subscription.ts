import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import type { BillingInterval } from "@/lib/plan";

// Stripe redirects back to whichever of these the checkout/portal flow
// actually started from (see create-checkout-session/customer-portal's
// returnPath) — keep in sync with those edge functions' allowlists.
export type BillingReturnPath = "/pricing" | "/portal/billing";

export type SubscriptionStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";

type SubscriptionRow = {
  status: SubscriptionStatus;
  current_period_end: string | null;
};

/**
 * Reads the current user's subscription status, cached via react-query.
 * subscriptions_select RLS is `user_id = auth.uid()` — this can only ever
 * read the caller's own row, never anyone else's.
 */
export const useSubscription = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async (): Promise<SubscriptionRow | null> => {
      // A user can end up with more than one row here over their billing
      // lifetime — e.g. resubscribing after a cancellation, or switching
      // monthly/annual via a fresh checkout instead of the customer portal
      // creates a new stripe_subscription_id, and upsert's onConflict target
      // is that id, not user_id. `.maybeSingle()` on >1 row throws (PostgREST
      // 406), which silently fell through to "inactive"/Free even for a
      // genuinely paid-up user — this is what was reported as "billing page
      // shows Free even though I've paid". Fetch every row for the user and
      // pick whichever actually reflects live access, instead of assuming
      // there's exactly one.
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const priority: SubscriptionStatus[] = ["active", "trialing", "past_due", "canceled", "inactive"];
      const best = priority.map((s) => data.find((r) => r.status === s)).find((r) => r != null);
      return (best ?? data[0]) as SubscriptionRow;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const status: SubscriptionStatus = user ? query.data?.status ?? "inactive" : "inactive";

  return {
    status,
    // Admins bypass all plan gating regardless of subscription status.
    isPro: isAdmin || status === "active" || status === "trialing",
    isAdmin,
    currentPeriodEnd: query.data?.current_period_end ?? null,
    isLoading: authLoading || roleLoading || (!!user && query.isLoading),
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ["subscription", user?.id] }),
  };
};

/**
 * Wraps the create-checkout-session / customer-portal edge functions with
 * busy state and error toasts — the same flow both Pricing and Billing pages
 * need to start an upgrade or open Stripe's hosted billing portal.
 */
export const useBillingActions = () => {
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);

  // returnPath: where Stripe should send the user back to when they're
  // done — defaults to /pricing, but callers on the portal Billing page
  // should pass "/portal/billing" so a completed payment (or "manage
  // subscription") doesn't dump them out of the portal onto the public
  // marketing page.
  const startCheckout = async (interval: BillingInterval = "monthly", returnPath: BillingReturnPath = "/pricing") => {
    setCheckoutBusy(true);
    const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
      "create-checkout-session",
      { body: { interval, returnPath } },
    );
    setCheckoutBusy(false);
    if (error || !data?.url) {
      toast.error(data?.error ?? "Couldn't start checkout. Please try again.");
      return;
    }
    window.location.href = data.url;
  };

  const openPortal = async (returnPath: BillingReturnPath = "/pricing") => {
    setPortalBusy(true);
    const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
      "customer-portal",
      { body: { returnPath } },
    );
    setPortalBusy(false);
    if (error || !data?.url) {
      toast.error(data?.error ?? "Couldn't open the billing portal. Please try again.");
      return;
    }
    window.location.href = data.url;
  };

  return { startCheckout, openPortal, checkoutBusy, portalBusy };
};

/**
 * Handles the ?checkout=success/cancel query param Stripe redirects back
 * with — shared by Pricing and Billing so the polling/toast/param-cleanup
 * logic exists exactly once. Returns the result so callers can render their
 * own success state (e.g. Billing's success animation) on top of it.
 */
export const useCheckoutRedirectResult = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { invalidate } = useSubscription();
  const [result, setResult] = useState<"success" | "cancel" | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    setSearchParams(
      (p) => {
        p.delete("checkout");
        return p;
      },
      { replace: true }
    );

    if (checkout === "success") {
      setResult("success");
      toast.success("Payment received - activating your Pro plan…");
      // The webhook that flips `subscriptions.status` can lag the redirect
      // by a second or two, so give it a few retries rather than showing
      // "still on Free" right away.
      let attempts = 0;
      const poll = window.setInterval(() => {
        attempts += 1;
        invalidate();
        if (attempts >= 5) window.clearInterval(poll);
      }, 1500);
      return () => window.clearInterval(poll);
    }

    if (checkout === "cancel") {
      setResult("cancel");
      toast.info("Checkout cancelled - you're still on the Free plan.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return result;
};

export type PaymentRecord = {
  id: string;
  amountUsd: number;
  currency: string;
  status: string;
  createdAt: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  number: string | null;
};

/**
 * Past payments for the signed-in user, read live from Stripe (via the
 * billing-history edge function) rather than a local table — there's no
 * local invoices table, Stripe is the only source of truth for what was
 * actually charged.
 */
export const usePaymentHistory = () => {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["payment-history", user?.id],
    queryFn: async (): Promise<PaymentRecord[]> => {
      const { data, error } = await supabase.functions.invoke<{ payments?: PaymentRecord[]; error?: string }>(
        "billing-history",
        { body: {} },
      );
      if (error) throw new Error(data?.error ?? error.message);
      return data?.payments ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    payments: query.data ?? [],
    isLoading: authLoading || (!!user && query.isLoading),
    isError: query.isError,
  };
};
