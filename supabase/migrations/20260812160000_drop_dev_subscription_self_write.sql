-- Real Stripe checkout is live now (create-checkout-session/stripe-webhook
-- both deployed and working) — the dev-only self-write policies from
-- 20260806120000_add_dev_subscription_self_write.sql are now a genuine
-- plan-limit bypass (any signed-in user could set their own subscription
-- to 'active' directly), not just a testing convenience, exactly as that
-- migration's own header warned. Real writes only come from
-- stripe-webhook's service-role client from here on.
DROP POLICY IF EXISTS subscriptions_dev_self_insert ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_dev_self_update ON public.subscriptions;
