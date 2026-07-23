-- Category taxonomy for the public blog's filter pills. A fixed set (not a
-- separate table) since it's small and only ever edited by admins from the
-- post editor's dropdown.
ALTER TABLE public.posts
  ADD COLUMN category text NOT NULL DEFAULT 'General'
  CHECK (category IN ('General', 'Market Trends', 'Procurement Tips', 'Country Spotlight'));
