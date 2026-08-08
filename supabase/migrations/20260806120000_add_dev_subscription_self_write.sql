-- TEMPORARY, dev-only: lets a signed-in user write their own subscriptions
-- row directly from the client, so the "Simulate upgrade/downgrade" buttons
-- on the Billing page can flip Pro/Free status without a real Stripe
-- checkout. subscriptions_select (20260722130000_create_billing_tables.sql)
-- already restricts SELECT the same way; there was deliberately no
-- INSERT/UPDATE policy before this, since real subscription writes are
-- meant to come only from the stripe-webhook edge function's service role.
--
-- DELETE THIS MIGRATION (or DROP these two policies) once real Stripe
-- checkout is live — a user being able to set their own subscription to
-- 'active' is a genuine plan-limit bypass once payments are real, not just
-- a testing convenience.
CREATE POLICY subscriptions_dev_self_insert ON public.subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY subscriptions_dev_self_update ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
