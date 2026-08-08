-- Blog post scheduling: a draft can carry a future `scheduled_at`, and
-- pg_cron flips it to 'published' on its own once that time arrives — no
-- admin needs to be online or load the site for it to go live. Posts stay
-- invisible to the public the whole time they're 'scheduled' (posts_select
-- in 20260722120000_create_posts_and_blog_images.sql only allows
-- status = 'published' through for non-admins), so no RLS changes needed.
--
-- PREREQUISITE: the pg_cron extension must be enabled on this project first
-- — Supabase Dashboard → Database → Extensions → search "pg_cron" → Enable
-- (or run `CREATE EXTENSION IF NOT EXISTS pg_cron;` yourself before this
-- file if you have permission to).

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_status_check;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_status_check CHECK (status IN ('draft', 'scheduled', 'published'));

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

CREATE OR REPLACE FUNCTION public.publish_scheduled_posts()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.posts
  SET status = 'published', published_at = now(), scheduled_at = null
  WHERE status = 'scheduled' AND scheduled_at <= now();
$$;

-- Re-runnable: drops any existing job with this name before scheduling, so
-- this migration can be pasted again without a "job already exists" error.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-scheduled-posts') THEN
    PERFORM cron.unschedule('publish-scheduled-posts');
  END IF;
END $$;

SELECT cron.schedule(
  'publish-scheduled-posts',
  '* * * * *', -- every minute
  $$SELECT public.publish_scheduled_posts();$$
);
