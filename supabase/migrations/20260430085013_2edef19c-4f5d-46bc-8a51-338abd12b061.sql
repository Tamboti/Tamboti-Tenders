-- Tenders: allow public SELECT
DROP POLICY IF EXISTS tenders_select ON public.tenders;
CREATE POLICY tenders_select ON public.tenders
  FOR SELECT USING (true);

-- Scrape logs: allow public SELECT
DROP POLICY IF EXISTS scrapelogs_select ON public.scrape_logs;
CREATE POLICY scrapelogs_select ON public.scrape_logs
  FOR SELECT USING (true);

-- Tender notes: allow public SELECT
DROP POLICY IF EXISTS notes_select ON public.tender_notes;
CREATE POLICY notes_select ON public.tender_notes
  FOR SELECT USING (true);

-- User profiles: allow public SELECT (so role can be checked once auth lands)
DROP POLICY IF EXISTS profiles_select ON public.user_profiles;
CREATE POLICY profiles_select ON public.user_profiles
  FOR SELECT USING (true);