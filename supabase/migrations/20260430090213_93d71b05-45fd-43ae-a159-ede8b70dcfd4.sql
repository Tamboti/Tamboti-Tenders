-- Tenders: allow any update (e.g. workflow_status changes) for now
DROP POLICY IF EXISTS tenders_update ON public.tenders;
CREATE POLICY tenders_update ON public.tenders
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tenders_delete ON public.tenders;
CREATE POLICY tenders_delete ON public.tenders
  FOR DELETE USING (true);

-- Bookmarks: allow anon insert/delete/select
DROP POLICY IF EXISTS bookmarks_select ON public.tender_bookmarks;
CREATE POLICY bookmarks_select ON public.tender_bookmarks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS bookmarks_insert ON public.tender_bookmarks;
CREATE POLICY bookmarks_insert ON public.tender_bookmarks
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS bookmarks_delete ON public.tender_bookmarks;
CREATE POLICY bookmarks_delete ON public.tender_bookmarks
  FOR DELETE USING (true);

-- Notes: allow anon insert/update/delete
DROP POLICY IF EXISTS notes_insert ON public.tender_notes;
CREATE POLICY notes_insert ON public.tender_notes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS notes_delete ON public.tender_notes;
CREATE POLICY notes_delete ON public.tender_notes
  FOR DELETE USING (true);

DROP POLICY IF EXISTS notes_update ON public.tender_notes;
CREATE POLICY notes_update ON public.tender_notes
  FOR UPDATE USING (true) WITH CHECK (true);