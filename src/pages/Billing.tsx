import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useSubscription, useBillingActions } from "@/hooks/use-subscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { handleDbError } from "@/lib/dbError";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar } from "@/components/icons";
import { formatDate } from "@/lib/format";
import { PRO_PRICE_USD } from "@/lib/plan";

const STATUS_LABEL: Record<string, string> = {
  active: "Pro",
  trialing: "Pro (trial)",
  past_due: "Payment failed",
  canceled: "Canceled",
  inactive: "Free",
};

export default function Billing() {
  const { user } = useAuth();
  const { status, isPro, isAdmin, currentPeriodEnd, isLoading, invalidate } = useSubscription();
  const { startCheckout, openPortal, checkoutBusy, portalBusy } = useBillingActions();
  const [simulateBusy, setSimulateBusy] = useState<"pro" | "free" | null>(null);

  const hasStripeHistory = status !== "inactive";

  // TEMPORARY — writes directly to `subscriptions` (allowed for now by the
  // dev-only RLS policies in 20260806120000_add_dev_subscription_self_write.sql)
  // so Pro-gated features are testable before real Stripe checkout exists.
  // Delete this whole block, and that migration's policies, once
  // create-checkout-session/stripe-webhook are live — self-service writes to
  // this table are a real bypass once payments are real.
  const simulatePlan = async (next: "pro" | "free") => {
    if (!user) return;
    setSimulateBusy(next);
    const { data: existing, error: selectError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (selectError) {
      setSimulateBusy(null);
      toast.error(handleDbError(selectError));
      return;
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const patch =
      next === "pro"
        ? { status: "active" as const, current_period_end: periodEnd.toISOString() }
        : { status: "inactive" as const, current_period_end: null };

    const { error } = existing
      ? await supabase.from("subscriptions").update(patch).eq("id", existing.id)
      : await supabase.from("subscriptions").insert({ user_id: user.id, ...patch });

    setSimulateBusy(null);
    if (error) {
      toast.error(handleDbError(error));
      return;
    }
    toast.success(next === "pro" ? "Simulated: now on Pro" : "Simulated: back to Free");
    invalidate();
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Your plan and subscription details.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-lg font-semibold text-foreground">{isPro ? "Pro" : "Free"}</p>
          </div>
          <Badge variant={status === "past_due" ? "destructive" : isPro ? "default" : "secondary"}>
            {isLoading ? "…" : isAdmin ? "Admin" : STATUS_LABEL[status] ?? status}
          </Badge>
        </div>

        {(status === "active" || status === "trialing") && currentPeriodEnd && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Next billing date: {formatDate(currentPeriodEnd)}
          </div>
        )}

        {status === "past_due" && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Your last payment failed. Update your payment method to keep your Pro features — your
              subscription may be canceled otherwise.
            </span>
          </div>
        )}

        {isAdmin && (
          <p className="text-sm text-muted-foreground">
            Admins get full Pro-level access regardless of subscription status.
          </p>
        )}

        {!isPro && (
          <p className="text-sm text-muted-foreground">
            Upgrade to Pro for ${PRO_PRICE_USD}/month to unlock early visibility, unlimited bookmarks,
            and unlimited alerts.
          </p>
        )}

        {!isAdmin && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {hasStripeHistory ? (
              <Button disabled={portalBusy} onClick={() => void openPortal()}>
                {portalBusy ? "Opening…" : "Manage subscription"}
              </Button>
            ) : (
              <Button disabled={checkoutBusy} onClick={() => void startCheckout()}>
                {checkoutBusy ? "Redirecting…" : "Upgrade to Pro"}
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/pricing">Compare plans</Link>
            </Button>
          </div>
        )}
      </Card>

      {/* TEMPORARY — remove once real Stripe checkout is live, see
          simulatePlan above. Not shown to admins: they always bypass
          gating, so simulating a plan wouldn't change anything visible. */}
      {!isAdmin && (
        <Card className="p-6 space-y-3 border-dashed">
          <div>
            <p className="text-sm font-semibold text-foreground">Developer testing</p>
            <p className="text-sm text-muted-foreground">
              No Stripe checkout yet — flip your own plan here to test Pro-gated features.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={simulateBusy !== null || isPro}
              onClick={() => void simulatePlan("pro")}
            >
              {simulateBusy === "pro" ? "Simulating…" : "Simulate: set to Pro"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={simulateBusy !== null || !isPro}
              onClick={() => void simulatePlan("free")}
            >
              {simulateBusy === "free" ? "Simulating…" : "Simulate: set to Free"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
