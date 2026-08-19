import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, useBillingActions, useCheckoutRedirectResult } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Check } from "@/components/icons";
import { Seo } from "@/components/seo/Seo";
import { PaymentSuccessOverlay } from "@/components/billing/PaymentSuccessOverlay";
import {
  PRO_PRICE_USD,
  PRO_PRICE_ANNUAL_TOTAL_USD,
  PRO_PRICE_ANNUAL_MONTHLY_EQUIVALENT_USD,
  PRO_ANNUAL_SAVINGS_PERCENT,
  FREE_PLAN_FEATURES,
  PRO_PLAN_FEATURES,
  type BillingInterval,
} from "@/lib/plan";
import { cn } from "@/lib/utils";
import { fadeUp, staggerContainer } from "@/lib/motion";

export const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, isLoading: subLoading } = useSubscription();
  const { startCheckout, openPortal, checkoutBusy, portalBusy } = useBillingActions();
  const checkoutResult = useCheckoutRedirectResult();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  useEffect(() => {
    if (checkoutResult === "success") setShowSuccessOverlay(true);
  }, [checkoutResult]);

  const upgrade = () => {
    if (!user) {
      navigate("/login?mode=signup");
      return;
    }
    void startCheckout(billingInterval, "/pricing");
  };

  const proMonthlyDisplay =
    billingInterval === "annual" ? PRO_PRICE_ANNUAL_MONTHLY_EQUIVALENT_USD.toFixed(2) : PRO_PRICE_USD;

  return (
    <div>
      <Seo
        title="Pricing"
        description="Free tender search across Africa, or upgrade to Pro for early visibility and unlimited alerts."
        url={typeof window !== "undefined" ? window.location.origin + "/pricing" : undefined}
      />

      <section >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl px-6 py-8 text-center sm:px-6 sm:pt-20 lg:px-8"
        >
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Plans and pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Start free. Pay yearly and save {PRO_ANNUAL_SAVINGS_PERCENT}% on Pro.
          </p>

          <div className="relative mt-8 inline-flex h-11 items-center rounded-lg bg-muted p-1">
            {(["monthly", "annual"] as const).map((interval) => (
              <button
                key={interval}
                type="button"
                onClick={() => setBillingInterval(interval)}
                className={cn(
                  "relative z-10 flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-medium transition-colors",
                  billingInterval === interval ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {interval === "monthly" ? "Monthly" : "Annual"}
                {interval === "annual" && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      billingInterval === "annual"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted-foreground/10 text-muted-foreground"
                    )}
                  >
                    Save {PRO_ANNUAL_SAVINGS_PERCENT}%
                  </span>
                )}
                {billingInterval === interval && (
                  <motion.span
                    layoutId="pricing-billing-pill"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm"
                  />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="grid gap-6 md:grid-cols-2"
        >
          {/* Free */}
          <motion.div variants={fadeUp} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Free</h2>
            <p className="mt-1 text-sm text-muted-foreground">For your first few bids</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tabular-nums text-foreground">$0</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <ul className="mt-6 flex-1 space-y-3">
              {FREE_PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-foreground/85">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {/* Purely informational once signed in — there's nothing to
                "do" on this card for either an existing Free or Pro user,
                so it's disabled and just reflects their actual plan instead
                of always claiming "You're on Free" (the previous bug: this
                only ever checked whether *someone* was logged in, not which
                plan they're actually on). */}
            <Button
              variant="outline"
              size="lg"
              className="mt-8"
              disabled={!!user}
              onClick={() => navigate("/tenders")}
            >
              {!user ? "Browse tenders" : isPro ? "Included in Pro" : "You're on Free"}
            </Button>
          </motion.div>

          {/* Pro — solid primary card, inverted text/checklist, mirrors a dark
              "enterprise" pricing card but in-brand instead of black. */}
          <motion.div variants={fadeUp} className="relative flex flex-col rounded-2xl bg-primary p-6 shadow-lg">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-primary-foreground">Pro</h2>
              <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
                🔥Popular
              </span>
            </div>
            <p className="mt-1 text-sm text-primary-foreground/70">For individual bidders & consultants</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tabular-nums text-primary-foreground">${proMonthlyDisplay}</span>
              <span className="text-sm text-primary-foreground/70">/user/month</span>
            </div>
            <p className="mt-1 text-xs text-primary-foreground/70">
              {billingInterval === "annual"
                ? `Billed annually at $${PRO_PRICE_ANNUAL_TOTAL_USD}/year`
                : "Billed monthly"}
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {PRO_PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 text-primary-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {isPro ? (
              <Button
                size="lg"
                className="mt-8 bg-white text-primary hover:bg-white/90"
                disabled={portalBusy}
                onClick={() => void openPortal("/pricing")}
              >
                {portalBusy ? "Opening…" : "Manage subscription"}
              </Button>
            ) : (
              <Button
                size="lg"
                className="mt-8 bg-white text-primary hover:bg-white/90"
                disabled={checkoutBusy || subLoading}
                onClick={upgrade}
              >
                {checkoutBusy ? "Redirecting…" : user ? "Upgrade to Pro" : "Sign up & upgrade"}
              </Button>
            )}
          </motion.div>
        </motion.div>
      </section>

      <PaymentSuccessOverlay
        open={showSuccessOverlay}
        onDismiss={() => {
          setShowSuccessOverlay(false);
          navigate("/portal/tenders");
        }}
      />
    </div>
  );
};

export default Pricing;
