import { Link } from "react-router-dom";
import { useSubscription, useBillingActions } from "@/hooks/use-subscription";
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
  const { status, isPro, currentPeriodEnd, isLoading } = useSubscription();
  const { startCheckout, openPortal, checkoutBusy, portalBusy } = useBillingActions();

  const hasStripeHistory = status !== "inactive";

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
            {isLoading ? "…" : STATUS_LABEL[status] ?? status}
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

        {!isPro && (
          <p className="text-sm text-muted-foreground">
            Upgrade to Pro for ${PRO_PRICE_USD}/month to unlock early visibility, unlimited bookmarks,
            and unlimited alerts.
          </p>
        )}

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
      </Card>
    </div>
  );
}
