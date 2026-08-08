import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/use-user-role";
import type { BillingInterval } from "@/lib/plan";

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
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as SubscriptionRow | null;
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

  const startCheckout = async (interval: BillingInterval = "monthly") => {
    setCheckoutBusy(true);
    const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
      "create-checkout-session",
      { body: { interval } },
    );
    setCheckoutBusy(false);
    if (error || !data?.url) {
      toast.error(data?.error ?? "Couldn't start checkout. Please try again.");
      return;
    }
    window.location.href = data.url;
  };

  const openPortal = async () => {
    setPortalBusy(true);
    const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
      "customer-portal",
      { body: {} },
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
