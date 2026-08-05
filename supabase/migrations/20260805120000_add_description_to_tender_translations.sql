-- Lets the Description section be translated per-tender, the same way the
-- AI summary already is. English (tenders.description_en) is the pivot,
-- same as title/summary; nullable since not every tender has one yet.
ALTER TABLE public.tender_translations ADD COLUMN description text;
