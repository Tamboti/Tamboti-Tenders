ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS enrichment_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enrichment_error text,
  ADD COLUMN IF NOT EXISTS enriched_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_tenders_enrichment_queue
  ON public.tenders (enrichment_status, enrichment_attempts, created_at)
  WHERE enrichment_status = 'pending';