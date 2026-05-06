create table if not exists public.alert_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  enabled boolean not null default true,
  emails text[] not null default '{}',
  countries text[] not null default '{}',
  categories text[] not null default '{}',
  closing_soon_only boolean not null default false,
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly')),
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alert_preferences
  add constraint alert_preferences_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.alert_preferences enable row level security;

create policy "Users can view own alert preferences"
on public.alert_preferences
for select
using (auth.uid() = user_id);

create policy "Users can insert own alert preferences"
on public.alert_preferences
for insert
with check (auth.uid() = user_id);

create policy "Users can update own alert preferences"
on public.alert_preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own alert preferences"
on public.alert_preferences
for delete
using (auth.uid() = user_id);

create index if not exists idx_alert_preferences_enabled on public.alert_preferences (enabled);
create index if not exists idx_alert_preferences_user_id on public.alert_preferences (user_id);

create or replace function public.set_updated_at_alert_preferences()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_alert_preferences_updated_at on public.alert_preferences;
create trigger trg_alert_preferences_updated_at
before update on public.alert_preferences
for each row
execute function public.set_updated_at_alert_preferences();

