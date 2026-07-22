-- Billing groundwork only: schema + Stripe customer/subscription wiring.
-- No pricing page, no checkout flow, nothing paywalled yet — writes happen
-- only via the service-role key inside the stripe-webhook edge function,
-- same "no write policy = service-role only" pattern as alert_sent_tenders.

CREATE TABLE public.billing_customers (
  user_id uuid PRIMARY KEY REFERENCES public.user_profiles(id),
  stripe_customer_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id),
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  status text NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_customers_select ON public.billing_customers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at_subscriptions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_subscriptions();
