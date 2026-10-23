-- Run this ONCE in Supabase → SQL Editor if you created the table before the
-- Settings menu existed. It lets each user also save their display settings
-- (text size and theme) under key = 'settings'. Row-level security is unchanged.

alter table public.user_data drop constraint if exists user_data_key_check;
alter table public.user_data
  add constraint user_data_key_check check (key in ('projects', 'tasks', 'settings'));
