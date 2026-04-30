DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenders_source_source_id_key'
  ) THEN
    ALTER TABLE public.tenders
      ADD CONSTRAINT tenders_source_source_id_key UNIQUE (source, source_id);
  END IF;
END$$;