-- Admins can currently only read their own user_profiles/subscriptions row —
-- profiles_select and subscriptions_select were never given the is_admin()
-- bypass that site_visits_select/posts_select already use. In practice this
-- means the /admin/analytics "Total users" tile silently returns 0 for every
-- admin, and any admin-facing subscription stats would be equally empty.

DROP POLICY IF EXISTS profiles_select ON public.user_profiles;
CREATE POLICY profiles_select ON public.user_profiles
  FOR SELECT
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
