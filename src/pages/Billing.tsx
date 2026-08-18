import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription, useBillingActions, usePaymentHistory, useCheckoutRedirectResult } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentSuccessOverlay } from "@/components/billing/PaymentSuccessOverlay";
import { AlertTriangle, Calendar, Check, ExternalLink } from "@/components/icons";
import { formatCurrency, formatDate } from "@/lib/format";
import { PRO_PRICE_USD } from "@/lib/plan";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  active: "Pro",
  trialing: "Pro (trial)",
  past_due: "Payment failed",
  canceled: "Canceled",
  inactive: "Free",
};

// Status dots read like a system indicator, not a decoration — the color
// carries real meaning (paid & healthy, needs attention, or free).
const STATUS_DOT: Record<string, string> = {
  active: "bg-[hsl(var(--success))]",
  trialing: "bg-[hsl(var(--success))]",
  past_due: "bg-destructive",
  canceled: "bg-muted-foreground/40",
  inactive: "bg-muted-foreground/40",
};

const FREE_FEATURES = ["5 saved bookmarks", "1 tender alert", "Standard search"];
const PRO_FEATURES = ["Unlimited bookmarks", "Unlimited alerts", "Early visibility on new tenders", "Priority support"];

// ─── Shared bits ────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  );
}

function PaymentRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-24 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-3 w-14 rounded" />
        <Skeleton className="h-3.5 w-16 rounded" />
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Billing() {
  const navigate = useNavigate();
  const { status, isPro, isAdmin, currentPeriodEnd, isLoading } = useSubscription();
  const { startCheckout, openPortal, checkoutBusy, portalBusy } = useBillingActions();
  const { payments, isLoading: paymentsLoading } = usePaymentHistory();
  const checkoutResult = useCheckoutRedirectResult();

  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  useEffect(() => {
    if (checkoutResult === "success") setShowSuccessOverlay(true);
  }, [checkoutResult]);

  const hasStripeHistory = status !== "inactive";
  const planLabel = isLoading ? "…" : isAdmin ? "Admin" : STATUS_LABEL[status] ?? status;
  const dotColor = isAdmin ? "bg-primary" : STATUS_DOT[status] ?? "bg-muted-foreground/40";
  const isLive = !isAdmin && (status === "active" || status === "trialing");

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="page-title">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your plan and subscription details.</p>
      </div>

      {status === "past_due" && (
        <div className="mb-8 flex items-start gap-3 border-l-2 border-destructive pl-4 py-1 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Your last payment failed. Update your payment method to keep your Pro features — your
            subscription may be canceled otherwise.
          </span>
        </div>
      )}

      {/* Current plan */}
      <div className="flex flex-col gap-4 border-b border-border py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Eyebrow>Current plan</Eyebrow>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              {isLive && (
                <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", dotColor)} />
              )}
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", dotColor)} />
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {planLabel}
            </h2>
          </div>
          {isLive && currentPeriodEnd && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Renews {formatDate(currentPeriodEnd)}
            </p>
          )}
          {isAdmin && (
            <p className="mt-2 text-sm text-muted-foreground">
              Admins get full Pro-level access regardless of subscription status.
            </p>
          )}
        </div>

        {!isAdmin && (
          <div className="shrink-0">
            {hasStripeHistory ? (
              <Button disabled={portalBusy} onClick={() => void openPortal("/portal/billing")}>
                {portalBusy ? "Opening…" : "Manage subscription"}
              </Button>
            ) : (
              <Button disabled={checkoutBusy} onClick={() => void startCheckout("monthly", "/portal/billing")}>
                {checkoutBusy ? "Redirecting…" : "Upgrade to Pro"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Plans */}
      {!isAdmin && !isPro && (
        <div className="border-b border-border py-8">
          <Eyebrow>Plans</Eyebrow>

          <div className="mt-6 grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <div className="pb-6 sm:pb-0 sm:pr-8">
              <p className="text-sm font-medium text-foreground">Free</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums text-foreground">$0</p>
              <ul className="mt-5 space-y-2.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-6 sm:pt-0 sm:pl-8">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">Pro</p>
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-primary">
                  Recommended
                </span>
              </div>
              <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums text-foreground">
                ${PRO_PRICE_USD}
                <span className="text-base font-normal text-muted-foreground">/month</span>
              </p>
              <ul className="mt-5 space-y-2.5">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full sm:w-auto"
                disabled={checkoutBusy}
                onClick={() => void startCheckout("monthly", "/portal/billing")}
              >
                {checkoutBusy ? "Redirecting…" : "Upgrade to Pro"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Payment history */}
      {!isAdmin && (
        <div className="py-8">
          <Eyebrow>Payment history</Eyebrow>
          <p className="mt-1 text-sm text-muted-foreground">Receipts for your past Pro payments.</p>

          {paymentsLoading ? (
            <div className="mt-4 divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <PaymentRowSkeleton key={i} />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{formatDate(p.createdAt)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.number ?? "—"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="text-xs capitalize text-muted-foreground">{p.status}</span>
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {formatCurrency(p.amountUsd, p.currency.toUpperCase())}
                    </span>
                    {p.hostedInvoiceUrl && (
                      <a
                        href={p.hostedInvoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                      >
                        Receipt
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <PaymentSuccessOverlay
        open={showSuccessOverlay}
        onDismiss={() => {
          setShowSuccessOverlay(false);
          navigate("/portal/tenders");
        }}
      />
    </div>
  );
}