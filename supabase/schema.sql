-- Vibeboard database setup. Run this once in Supabase → SQL Editor → New query.
--
-- One table holds each user's saved data as JSON:
--   key = 'projects' → the list of projects (with their deliverable links)
--   key = 'tasks'    → every task on every board
--   key = 'settings' → text size and theme (D60)
--
-- Row-level security (RLS) is what keeps accounts apart: the database itself
-- only ever lets a signed-in user see or change rows where user_id is their
-- own id. Even someone with the public "anon" key can't read other people's data.

create table if not exists public.user_data (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null check (key in ('projects', 'tasks', 'settings')),
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key),
  -- stop a single row growing without limit (about 2 MB)
  constraint user_data_size check (pg_column_size(value) < 2000000)
);

alter table public.user_data enable row level security;

-- Only signed-in users ("authenticated"), and only their own rows.
create policy "Read own data"   on public.user_data for select to authenticated using (auth.uid() = user_id);
create policy "Add own data"    on public.user_data for insert to authenticated with check (auth.uid() = user_id);
create policy "Change own data" on public.user_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Delete own data" on public.user_data for delete to authenticated using (auth.uid() = user_id);

-- Signed-out visitors get no access at all.
revoke all on public.user_data from anon;
