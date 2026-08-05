-- Enforces the Free-plan usage limits at the database boundary (not just the
-- UI), same "insert policy is the real gate" pattern as bookmarks_insert /
-- alert_preferences RLS. Numbers come from the settled pricing model: Free =
-- 5 bookmarks / 1 alert, Pro ($19/mo) removes both caps. See billing_customers
-- / subscriptions in 20260722130000_create_billing_tables.sql.

CREATE OR REPLACE FUNCTION public.is_pro_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status IN ('active', 'trialing')
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_bookmark_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_pro_user(NEW.user_id)
     AND (SELECT count(*) FROM public.tender_bookmarks WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Free plan limit reached: up to 5 bookmarks. Upgrade to Pro for unlimited bookmarks.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS bookmark_limit ON public.tender_bookmarks;
CREATE TRIGGER bookmark_limit
  BEFORE INSERT ON public.tender_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_bookmark_limit();

CREATE OR REPLACE FUNCTION public.enforce_alert_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_pro_user(NEW.user_id)
     AND (SELECT count(*) FROM public.alert_preferences WHERE user_id = NEW.user_id) >= 1 THEN
    RAISE EXCEPTION 'Free plan limit reached: 1 alert. Upgrade to Pro for unlimited alerts.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS alert_limit ON public.alert_preferences;
CREATE TRIGGER alert_limit
  BEFORE INSERT ON public.alert_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_alert_limit();
