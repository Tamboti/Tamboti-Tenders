
-- 1) Internal secrets table (no RLS policies = locked down from clients)
CREATE TABLE IF NOT EXISTS public.app_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_secrets (name, value)
VALUES ('alerts_cron_secret', 'b75a880573fbbd0eb92cd10583471490bef06c33d6fa3bae')
ON CONFLICT (name) DO NOTHING;

-- 2) Dedup table: which tenders we've already emailed per alert preference
CREATE TABLE IF NOT EXISTS public.alert_sent_tenders (
  alert_preference_id uuid NOT NULL REFERENCES public.alert_preferences(id) ON DELETE CASCADE,
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (alert_preference_id, tender_id)
);
CREATE INDEX IF NOT EXISTS idx_alert_sent_tenders_pref ON public.alert_sent_tenders(alert_preference_id);
ALTER TABLE public.alert_sent_tenders ENABLE ROW LEVEL SECURITY;
-- No policies = only service role (edge functions) can read/write.

-- 3) Schedule the digest every 15 minutes
DO $$
DECLARE
  v_secret text;
BEGIN
  SELECT value INTO v_secret FROM public.app_secrets WHERE name = 'alerts_cron_secret';

  PERFORM cron.unschedule('send-alert-digest') FROM cron.job WHERE jobname = 'send-alert-digest';

  PERFORM cron.schedule(
    'send-alert-digest',
    '*/15 * * * *',
    format($cmd$
      select net.http_post(
        url     := 'https://luykyredvhhcamcmgahp.supabase.co/functions/v1/send-alert-digest',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1eWt5cmVkdmhoY2FtY21nYWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MDM0NTksImV4cCI6MjA5MzA3OTQ1OX0.Kzo3KivcVpf10RzpX1omIUOdhMf1QKdxKCWRB5QcTsA',
          'Content-Type', 'application/json',
          'x-alerts-cron-secret', %L
        ),
        body    := '{}'::jsonb
      );
    $cmd$, v_secret)
  );
END $$;
