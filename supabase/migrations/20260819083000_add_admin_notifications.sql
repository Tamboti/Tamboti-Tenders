-- Cooldown ledger for admin quota/credit-exhaustion emails (scrape.do,
-- Lovable AI gateway). One row per issue key, tracking when we last
-- notified admins about it, so a multi-day outage sends one email instead
-- of one per failed request. Written only by edge functions with the
-- service-role key — no end-user or admin UI ever reads this directly, so
-- RLS is enabled with no policies (locked to service role), same pattern
-- as alert_sent_tenders.

CREATE TABLE public.admin_notifications (
  key text PRIMARY KEY,
  last_sent_at timestamptz NOT NULL
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
