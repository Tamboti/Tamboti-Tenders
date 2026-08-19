# Stripe go-live checklist

Do these in order. Nothing here should run until you're actually ready to
cut over — steps 4 and 5 affect real traffic the moment you run them.

## 1. Stripe Dashboard (your side)

- [ ] Account activation complete (business details, bank account) — Stripe
      won't release live payouts otherwise.
- [ ] Switch dashboard to **Live mode** (toggle, top left).
- [ ] Create live-mode Products/Prices matching the test ones (see
      `src/lib/plan.ts` — `PRO_PRICE_USD` is the source of truth, currently
      $99):
      - Pro Monthly — $99/month
      - Pro Annual — $990/year (10x monthly, 2 months free)
      Note both new `price_...` IDs.
- [ ] Developers → Webhooks (make sure you're in **Live mode**) → Add
      endpoint:
      `https://gdbodrzxdbtskyzmqmuu.supabase.co/functions/v1/stripe-webhook`
      Subscribe to exactly these events:
      - `checkout.session.completed`
      - `customer.subscription.created`
      - `customer.subscription.updated`
      - `customer.subscription.deleted`
      Copy the signing secret it generates (`whsec_...`) — this is a
      *different* secret from your test webhook's.

## 2. Update Supabase secrets

Run these yourself (real payment credentials — I'd rather not have live
keys pass through chat). Replace each placeholder with the real value:

```
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
supabase secrets set STRIPE_PRICE_ID_PRO_MONTHLY=price_xxxxxxxxxxxx
supabase secrets set STRIPE_PRICE_ID_PRO_ANNUAL=price_xxxxxxxxxxxx
```

No redeploy needed — every Stripe-touching function
(`create-checkout-session`, `customer-portal`, `stripe-webhook`,
`billing-history`) reads these at request time.

## 3. Clear out test-mode billing data — do this right before or right
   after flipping the secrets above

`create-checkout-session` reuses whatever `stripe_customer_id` is already
on file for a user instead of creating a new one. Any row created while
`STRIPE_SECRET_KEY` was a test key holds a test customer ID that will not
exist once the key is live — the first live checkout for that user would
fail outright. Clear it so everyone starts clean in live mode:

```sql
-- Run in Supabase Dashboard -> SQL Editor
delete from public.subscriptions;
delete from public.billing_customers;
```

This is safe pre-launch since there's no real paying customer yet — if
that's no longer true by the time you run this, tell me and we'll target
specific rows instead of wiping the table.

## 4. Verify end to end

- [ ] `supabase secrets list` shows updated timestamps on all four secrets.
- [ ] One real purchase (small amount, refundable from the Stripe
      Dashboard afterward) — confirms checkout, the webhook, the
      subscription flipping to Pro, and the redirect back to
      `/portal/tenders` all work with live keys. There's no live-mode
      test card, so this has to be a real charge.
- [ ] Stripe Dashboard -> Developers -> Webhooks -> your live endpoint ->
      confirm the test purchase's events show as delivered (200), not
      failed.

## 5. After confirming it works

Delete this file — it's a one-time checklist, not something that needs to
live in the repo.
