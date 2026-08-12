-- 1) Bookmarks: only owners can see their bookmarks
DROP POLICY IF EXISTS bookmarks_select ON public.tender_bookmarks;
CREATE POLICY bookmarks_select ON public.tender_bookmarks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2) Notes: restrict reads to authenticated users (blocks anon access, keeps team-wide collaboration)
DROP POLICY IF EXISTS notes_select ON public.tender_notes;
CREATE POLICY notes_select ON public.tender_notes
  FOR SELECT TO authenticated
  USING (true);

-- 3) Storage: lock down writes on the "Company assets" bucket to admins only
DROP POLICY IF EXISTS "company_assets_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_public_read" ON storage.objects;

CREATE POLICY "company_assets_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'Company assets');

CREATE POLICY "company_assets_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'Company assets' AND public.is_admin(auth.uid()));

CREATE POLICY "company_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'Company assets' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'Company assets' AND public.is_admin(auth.uid()));

CREATE POLICY "company_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'Company assets' AND public.is_admin(auth.uid()));

-- 4) Rotate alerts cron secret and reschedule the digest cron
DO $$
DECLARE
  v_secret text;
BEGIN
  v_secret := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.app_secrets (name, value)
  VALUES ('alerts_cron_secret', v_secret)
  ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, created_at = now();

  PERFORM cron.unschedule('send-alert-digest') FROM cron.job WHERE jobname = 'send-alert-digest';

  PERFORM cron.schedule(
    'send-alert-digest',
    '*/15 * * * *',
    format($cmd$
      select net.http_post(
        url     := 'https://gdbodrzxdbtskyzmqmuu.supabase.co/functions/v1/send-alert-digest',
        headers := jsonb_build_object(
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkYm9kcnp4ZGJ0c2t5em1xbXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMjY2NjksImV4cCI6MjA5ODcwMjY2OX0.pCHxLvAxtDHotmltmtzNpDp-wTMzSQGwRpdJHqOlOsw',
          'Content-Type', 'application/json',
          'x-alerts-cron-secret', %L
        ),
        body    := '{}'::jsonb
      );
    $cmd$, v_secret)
  );
END $$;