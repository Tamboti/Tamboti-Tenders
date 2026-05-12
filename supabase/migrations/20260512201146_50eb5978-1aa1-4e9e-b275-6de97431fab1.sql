
-- Restrict execution of is_admin so only the database engine (used inside RLS) can call it.
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;

-- Pre-existing helper missing explicit search_path
CREATE OR REPLACE FUNCTION public.set_updated_at_alert_preferences()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;
