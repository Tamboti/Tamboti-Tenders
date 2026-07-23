-- First-party, device-deduped visit tracking for the admin Analytics page.
-- One row per device per calendar day (PK enforces the dedupe — a client
-- upsert with ignoreDuplicates just no-ops on repeat visits same day),
-- keyed off the existing anonymous per-browser id (src/lib/anonUser.ts),
-- not a user account, so logged-out browsing counts too.
CREATE TABLE public.site_visits (
  device_id text NOT NULL,
  visited_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, visited_on)
);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Any visitor (including anon) can record their own visit.
CREATE POLICY site_visits_insert ON public.site_visits
  FOR INSERT
  WITH CHECK (true);

-- Only admins can read the raw rows (the Analytics page aggregates them).
CREATE POLICY site_visits_select ON public.site_visits
  FOR SELECT
  USING (public.is_admin(auth.uid()));
