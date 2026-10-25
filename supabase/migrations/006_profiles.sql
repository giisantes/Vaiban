-- Vaiban – account settings (D77). Run ONCE in Supabase → SQL Editor, after 005.
--
-- Adds:
--   * profiles – a picture, a short bio and a link (e.g. your GitHub page)
--     for each account. Name and display name stay in the account itself
--     (Supabase auth user_metadata), as before.
--   * Who can see a profile: its owner, and people who share an active board
--     with them – nobody else, so a profile isn't public.
--   * rename_my_tasks() – after changing your display name, tasks assigned to
--     your old name follow you (only on boards you're an active member of).
--   * a fix to 003, so a new display name reaches the boards you own.
--   * delete_my_account() – deletes the signed-in account. Everything that
--     belongs to it goes with it (the database already cascades): the boards
--     it owns (for everyone), its memberships, invites, prompts, AI skills,
--     settings and profile.

create table if not exists public.profiles (
  id         uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  bio        text        not null default '' check (char_length(bio) <= 160),
  link       text        not null default '' check (link = '' or (char_length(link) <= 200 and link ~ '^https://[^\s]+$')),
  -- a small square picture, resized in the browser, stored as a data: URL
  avatar     text        not null default '' check (avatar = '' or (char_length(avatar) <= 150000 and avatar ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')),
  updated_at timestamptz not null default now()
);

-- Do the signed-in user and u have an active board in common?
create or replace function public.shares_board_with(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.board_members a
    join public.board_members b on b.board_id = a.board_id
    where a.user_id = auth.uid() and a.status = 'active'
      and b.user_id = u and b.status = 'active'
  );
$$;

alter table public.profiles enable row level security;
drop policy if exists "Read own or teammates' profiles" on public.profiles;
drop policy if exists "Add own profile" on public.profiles;
drop policy if exists "Change own profile" on public.profiles;
drop policy if exists "Remove own profile" on public.profiles;
create policy "Read own or teammates' profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_board_with(id));
create policy "Add own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Change own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Remove own profile" on public.profiles for delete to authenticated using (id = auth.uid());
revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;

create or replace function public.profile_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists profile_touch on public.profiles;
create trigger profile_touch before insert or update on public.profiles
  for each row execute function public.profile_touch();

-- Fix (found while building this): 003's guard refused ANY change to a board's
-- owner_name, so refresh_my_name() failed for everyone who owns a board and
-- their new name never reached their boards. The owner may now update the
-- name shown for themselves; nobody can change who the owner is.
create or replace function public.boards_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id or new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'A board''s owner can''t be changed.' using errcode = '42501';
  end if;
  if new.owner_name is distinct from old.owner_name and old.owner_id is distinct from auth.uid() then
    raise exception 'Only the board owner can change the owner''s name.' using errcode = '42501';
  end if;
  if old.owner_id is distinct from auth.uid() and (new.name is distinct from old.name or new.description is distinct from old.description) then
    raise exception 'Only the board owner can rename it.' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Tasks assigned to my old display name now use my current one.
create or replace function public.rename_my_tasks(p_old text) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  new_name text := public.user_display_name(me);
  n integer;
begin
  if me is null or coalesce(p_old, '') = '' or p_old = new_name then return 0; end if;
  update public.tasks t
     set data = jsonb_set(t.data, '{assignee}', to_jsonb(new_name)), updated_at = now(), updated_by = me
   where t.data ->> 'assignee' = p_old
     and exists (select 1 from public.board_members m where m.board_id = t.board_id and m.user_id = me and m.status = 'active')
     -- don't take over a teammate who still uses that name
     and not exists (select 1 from public.board_members o where o.board_id = t.board_id and o.user_id <> me
                     and o.status = 'active' and o.display_name = p_old);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Deletes the signed-in account and, through the cascades, everything it owns.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.shares_board_with(uuid), public.rename_my_tasks(text), public.delete_my_account() from public, anon;
grant execute on function public.shares_board_with(uuid), public.rename_my_tasks(text), public.delete_my_account() to authenticated;

-- Teammates' pictures update live.
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
