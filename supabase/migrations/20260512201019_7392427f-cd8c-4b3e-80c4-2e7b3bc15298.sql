
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = _uid AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS tenders_update ON public.tenders;
CREATE POLICY tenders_update ON public.tenders
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS tenders_delete ON public.tenders;
CREATE POLICY tenders_delete ON public.tenders
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS notes_insert ON public.tender_notes;
CREATE POLICY notes_insert ON public.tender_notes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notes_update ON public.tender_notes;
CREATE POLICY notes_update ON public.tender_notes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notes_delete ON public.tender_notes;
CREATE POLICY notes_delete ON public.tender_notes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS bookmarks_insert ON public.tender_bookmarks;
CREATE POLICY bookmarks_insert ON public.tender_bookmarks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS bookmarks_delete ON public.tender_bookmarks;
CREATE POLICY bookmarks_delete ON public.tender_bookmarks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
