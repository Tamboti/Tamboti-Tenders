-- is_pro_user() (20260805120000_add_plan_limits.sql) gates the bookmark/alert
-- INSERT triggers but only ever checked `subscriptions` — an admin with no
-- active subscription row still got the free-plan trigger exception, even
-- after the client-side isPro bypass (use-subscription.ts) let the request
-- through. Admins are meant to bypass all plan gating, so fold the
-- user_profiles.role check in here too; the triggers already call
-- is_pro_user(), so replacing the function is enough.
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
  )
  OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = _user_id AND role = 'admin'
  );
$$;
