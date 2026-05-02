-- Restrict user_profiles SELECT to own row
DROP POLICY IF EXISTS profiles_select ON public.user_profiles;
CREATE POLICY profiles_select ON public.user_profiles
  FOR SELECT
  USING (id = auth.uid());

-- Prevent users from changing their own role via UPDATE
DROP POLICY IF EXISTS profiles_update ON public.user_profiles;
CREATE POLICY profiles_update ON public.user_profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
  );