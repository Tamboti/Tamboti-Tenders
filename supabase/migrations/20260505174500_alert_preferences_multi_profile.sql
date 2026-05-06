alter table public.alert_preferences
  drop constraint if exists alert_preferences_user_id_key;

alter table public.alert_preferences
  add column if not exists name text not null default 'New alert';

create index if not exists idx_alert_preferences_user_enabled
  on public.alert_preferences (user_id, enabled);

