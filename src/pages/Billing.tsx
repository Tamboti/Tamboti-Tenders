import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription, useBillingActions, usePaymentHistory, useCheckoutRedirectResult } from "@/hooks/use-subscription";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Check, ExternalLink, Loader2 } from "@/components/icons";
import { formatCurrency, formatDate } from "@/lib/format";
import { PRO_PRICE_USD } from "@/lib/plan";

const STATUS_LABEL: Record<string, string> = {
  active: "Pro",
  trialing: "Pro (trial)",
  past_due: "Payment failed",
  canceled: "Canceled",
  inactive: "Free",
};

const FREE_FEATURES = ["5 saved bookmarks", "1 tender alert", "Standard search"];
const PRO_FEATURES = ["Unlimited bookmarks", "Unlimited alerts", "Early visibility on new tenders", "Priority support"];

function PaymentSuccessOverlay({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onDismiss}
          className="fixed inset-0 z-50 flex items-center h-full justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col items-center gap-4 px-8 py-10 text-center max-w-sm"
          >
            <svg width="88" height="88" viewBox="0 0 88 88">
              <motion.circle
                cx="44"
                cy="44"
                r="35"
                fill="none"
                stroke="hsl(var(--success))"
                strokeWidth="4"
                strokeLinecap="round"
                transform="rotate(-90 44 44)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
              <motion.path
                d="M28 45 L39 56 L60 32"
                fill="none"
                stroke="hsl(var(--success))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.55 }}
              />
            </svg>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.85 }}
              className="space-y-1.5"
            >
              <p className="text-lg font-semibold text-white">Payment successful</p>
              <p className="text-sm text-white/70">
                You're now on Pro - unlimited bookmarks, alerts and early visibility on every tender.
              </p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 1.05 }}
              onClick={onDismiss}
              className="mt-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-black hover:bg-white/90 transition-colors"
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Billing() {
  const { status, isPro, isAdmin, currentPeriodEnd, isLoading } = useSubscription();
  const { startCheckout, openPortal, checkoutBusy, portalBusy } = useBillingActions();
  const { payments, isLoading: paymentsLoading } = usePaymentHistory();
  const checkoutResult = useCheckoutRedirectResult();

  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  useEffect(() => {
    if (checkoutResult === "success") setShowSuccessOverlay(true);
  }, [checkoutResult]);

  const hasStripeHistory = status !== "inactive";

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto ">
      <div className="mb-4">
        <h1 className="page-title">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Your plan and subscription details.</p>
      </div>

      {status === "past_due" && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Your last payment failed. Update your payment method to keep your Pro features — your
            subscription may be canceled otherwise.
          </span>
        </div>
      )}

      <Card className="p-6 sm:p-8 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <span className="text-lg font-semibold text-foreground">{isPro || isAdmin ? "P" : "F"}</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</p>
              <p className="text-xl font-semibold text-foreground">
                {isLoading ? "…" : isAdmin ? "Admin" : STATUS_LABEL[status] ?? status}
              </p>
              {(status === "active" || status === "trialing") && currentPeriodEnd && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Renews {formatDate(currentPeriodEnd)}
                </p>
              )}
            </div>
          </div>

          {!isAdmin && (
            <div className="flex items-center gap-3">
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

        {isAdmin && (
          <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
            Admins get full Pro-level access regardless of subscription status.
          </p>
        )}
      </Card>

      {!isAdmin && !isPro && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-3">Plans</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">Free</p>
                <p className="text-2xl font-semibold text-foreground mt-1">$0</p>
              </div>
              <ul className="space-y-2">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 space-y-4 border-2 border-primary relative">
              <Badge className="absolute -top-2.5 left-6">Recommended</Badge>
              <div>
                <p className="text-sm font-medium text-foreground">Pro</p>
                <p className="text-2xl font-semibold text-foreground mt-1">
                  ${PRO_PRICE_USD}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
              </div>
              <ul className="space-y-2">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full" disabled={checkoutBusy} onClick={() => void startCheckout("monthly", "/portal/billing")}>
                {checkoutBusy ? "Redirecting…" : "Upgrade to Pro"}
              </Button>
            </Card>
          </div>
        </div>
      )}

      {!isAdmin && (
        <Card className="p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Payment history</p>
            <p className="text-sm text-muted-foreground">Receipts for your past Pro payments.</p>
          </div>

          {paymentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(p.amountUsd, p.currency.toUpperCase())}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.createdAt)}
                      {p.number ? ` · ${p.number}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {p.status}
                    </Badge>
                    {p.hostedInvoiceUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={p.hostedInvoiceUrl} target="_blank" rel="noreferrer">
                          Receipt
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <PaymentSuccessOverlay open={showSuccessOverlay} onDismiss={() => setShowSuccessOverlay(false)} />
    </div>
  );
}