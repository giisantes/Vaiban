-- Vaiban 003: shared boards (D62–D66).
-- Run once in Supabase → SQL Editor → New query, after schema.sql and 002.
--
-- Before: each account kept its projects and tasks as two JSON blobs in
-- user_data. That can't be shared, and two people saving the same blob would
-- overwrite each other's work.
-- After:  a board (project) is its own row, each task is its own row, and
--         board_members says who may see which board. user_data keeps only
--         the display settings.
--
-- Who can see what (enforced by the database, not the app):
--   * A board, its tasks and its member list: only its ACTIVE members.
--     Being on one of someone's boards gives no access to their other boards.
--   * Someone who opens an invite link only becomes a PENDING member. They see
--     the board's name and nothing else until the owner approves them – so a
--     leaked link on its own gets nobody in.
--   * An email invite is the owner approving one named person in advance: it
--     lets in only someone signed in with that exact, confirmed email address.
--     Anyone else who uses that link is pending like any other link.
--   * Members' email addresses are shown to the board owner only.
--   * Invite links expire after 7 days and the owner can turn them off.

-- ───────────────────────── tables ─────────────────────────

create table public.boards (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  owner_name  text        not null default '',
  name        text        not null check (char_length(name) between 1 and 120),
  description text        not null default '' check (char_length(description) <= 500),
  anchors     jsonb       not null default '[]' check (jsonb_typeof(anchors) = 'array' and pg_column_size(anchors) < 20000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.board_members (
  board_id     uuid        not null references public.boards (id) on delete cascade,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  role         text        not null default 'member' check (role in ('owner', 'member')),
  status       text        not null default 'pending' check (status in ('active', 'pending')),
  display_name text        not null default '',
  requested_at timestamptz not null default now(),
  joined_at    timestamptz,
  primary key (board_id, user_id)
);
create index board_members_user on public.board_members (user_id);

create table public.board_invites (
  id          uuid        primary key default gen_random_uuid(),
  board_id    uuid        not null references public.boards (id) on delete cascade,
  -- 64 random hex characters (two v4 UUIDs = 244 random bits): can't be guessed
  token       text        not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  email       text        check (email is null or email = lower(email)),  -- null = a share link
  created_by  uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  revoked_at  timestamptz,
  used_at     timestamptz,
  declined_at timestamptz
);
create index board_invites_board on public.board_invites (board_id);
create index board_invites_email on public.board_invites (email) where email is not null;

-- One row per task, so two people editing different cards never overwrite each other.
create table public.tasks (
  board_id   uuid        not null references public.boards (id) on delete cascade,
  id         text        not null check (char_length(id) between 1 and 64),
  data       jsonb       not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 200000),
  updated_at timestamptz not null default now(),
  updated_by uuid        default auth.uid(),
  primary key (board_id, id)
);

-- ───────────────────────── helpers ─────────────────────────
-- "security definer" so the policies below can check membership without
-- tripping over board_members' own policy (which would loop forever).

create function public.is_board_member(b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.board_members m
                 where m.board_id = b and m.user_id = auth.uid() and m.status = 'active');
$$;

create function public.is_board_owner(b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.boards x where x.id = b and x.owner_id = auth.uid());
$$;

-- The name shown on cards and member lists: username, else full name, else email.
create function public.user_display_name(u uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(raw_user_meta_data ->> 'username', ''), nullif(raw_user_meta_data ->> 'name', ''), email, '')
  from auth.users where id = u;
$$;

-- ───────────────────────── row-level security ─────────────────────────

alter table public.boards        enable row level security;
alter table public.board_members enable row level security;
alter table public.board_invites enable row level security;
alter table public.tasks         enable row level security;

-- Boards: members see and edit (deliverable links); only the owner deletes.
-- New boards are made through create_board(), which also adds the owner as a member.
create policy "Members read board"   on public.boards for select to authenticated using (public.is_board_member(id));
create policy "Members update board" on public.boards for update to authenticated using (public.is_board_member(id)) with check (public.is_board_member(id));
create policy "Owner deletes board"  on public.boards for delete to authenticated using (owner_id = auth.uid());

-- Only the owner may rename a board or change who owns it.
create function public.boards_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id or new.owner_name is distinct from old.owner_name
     or new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'A board''s owner can''t be changed.' using errcode = '42501';
  end if;
  if old.owner_id <> auth.uid() and (new.name is distinct from old.name or new.description is distinct from old.description) then
    raise exception 'Only the board owner can rename it.' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger boards_guard before update on public.boards for each row execute function public.boards_guard();

-- Members: you see your own row; active members see the other active members;
-- the owner also sees pending requests. Changes go through the functions below.
create policy "See board members" on public.board_members for select to authenticated using (
  user_id = auth.uid()
  or public.is_board_owner(board_id)
  or (status = 'active' and public.is_board_member(board_id))
);

-- Invites: owner only (people using a link go through the functions below).
create policy "Owner reads invites" on public.board_invites for select to authenticated using (public.is_board_owner(board_id));

-- Tasks: every active member of the board can read and change them.
create policy "Members read tasks"   on public.tasks for select to authenticated using (public.is_board_member(board_id));
create policy "Members add tasks"    on public.tasks for insert to authenticated with check (public.is_board_member(board_id));
create policy "Members change tasks" on public.tasks for update to authenticated using (public.is_board_member(board_id)) with check (public.is_board_member(board_id));
create policy "Members delete tasks" on public.tasks for delete to authenticated using (public.is_board_member(board_id));

create function public.tasks_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger tasks_stamp before insert or update on public.tasks for each row execute function public.tasks_stamp();

-- Least privilege: signed-out visitors get nothing; signed-in users only the
-- table operations the policies above are written for.
revoke all on public.boards, public.board_members, public.board_invites, public.tasks from anon, authenticated;
grant select, update, delete         on public.boards        to authenticated;
grant select                         on public.board_members to authenticated;
grant select                         on public.board_invites to authenticated;
grant select, insert, update, delete on public.tasks         to authenticated;

-- ───────────────────────── actions ─────────────────────────
-- Each checks who is asking (auth.uid()) itself, because it runs with the
-- database owner's rights.

-- New board, with its creator as the active owner.
create function public.create_board(p_id uuid, p_name text, p_description text default '', p_anchors jsonb default '[]')
returns public.boards
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  b public.boards;
begin
  if me is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if (select count(*) from public.boards where owner_id = me) >= 200 then
    raise exception 'You have reached the limit of 200 boards.' using errcode = 'P0001';
  end if;
  insert into public.boards (id, owner_id, owner_name, name, description, anchors)
  values (coalesce(p_id, gen_random_uuid()), me, public.user_display_name(me), p_name, coalesce(p_description, ''), coalesce(p_anchors, '[]'))
  on conflict (id) do nothing
  returning * into b;
  if b.id is null then
    -- Already exists (a retried request): fine if it's ours, otherwise refuse.
    select * into b from public.boards where id = p_id and owner_id = me;
    if b.id is null then raise exception 'That board id is taken.' using errcode = '42501'; end if;
    return b;
  end if;
  insert into public.board_members (board_id, user_id, role, status, display_name, joined_at)
  values (b.id, me, 'owner', 'active', public.user_display_name(me), now());
  return b;
end $$;

-- Owner: make (or reuse) an invite. p_email null = the board's share link.
-- An existing live invite is reused and its 7 days start again.
create function public.create_invite(p_board uuid, p_email text default null)
returns table (id uuid, token text, email text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  e text := nullif(lower(trim(p_email)), '');
  inv public.board_invites;
begin
  if not public.is_board_owner(p_board) then raise exception 'Only the board owner can invite people.' using errcode = '42501'; end if;
  if e is not null and e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'That doesn''t look like an email address.' using errcode = '22023'; end if;
  if (select count(*) from public.board_invites i where i.board_id = p_board and i.revoked_at is null and i.used_at is null and i.expires_at > now()) >= 100 then
    raise exception 'This board has too many open invitations. Cancel some first.' using errcode = 'P0001';
  end if;
  update public.board_invites i set expires_at = now() + interval '7 days', declined_at = null
  where i.board_id = p_board and i.email is not distinct from e and i.revoked_at is null and i.used_at is null and i.expires_at > now()
  returning * into inv;
  if inv.id is null then
    insert into public.board_invites (board_id, email) values (p_board, e) returning * into inv;
  end if;
  return query select inv.id, inv.token, inv.email, inv.expires_at;
end $$;

-- Owner: turn off a link or cancel an email invite.
create function public.revoke_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.board_invites set revoked_at = now()
  where id = p_invite and public.is_board_owner(board_id) and revoked_at is null;
  if not found then raise exception 'Invite not found.' using errcode = 'P0002'; end if;
end $$;

-- Anyone signed in, holding a link: what board is this? Reveals only the
-- board's name and owner – never its tasks, members, or who the invite was for.
create function public.invite_info(p_token text)
returns table (board_id uuid, board_name text, owner_name text, usable boolean, my_status text)
language sql stable security definer set search_path = '' as $$
  select b.id, b.name, b.owner_name,
         (i.revoked_at is null and i.used_at is null and i.expires_at > now()),
         (select m.status from public.board_members m where m.board_id = b.id and m.user_id = auth.uid())
  from public.board_invites i join public.boards b on b.id = i.board_id
  where i.token = p_token and auth.uid() is not null;
$$;

-- Ask to join with a link. Returns 'pending', or 'active' when the link was an
-- email invite for this user's own confirmed address (the owner already chose them).
create function public.request_to_join(p_token text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  inv public.board_invites;
  current_status text;
  my_email text;
  approved boolean;
begin
  if me is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into inv from public.board_invites where token = p_token;
  if inv.id is null or inv.revoked_at is not null or inv.used_at is not null or inv.expires_at <= now() then
    raise exception 'This invite has expired or been turned off. Ask the board owner for a new one.' using errcode = 'P0001';
  end if;

  select status into current_status from public.board_members where board_id = inv.board_id and user_id = me;
  select lower(email) into my_email from auth.users where id = me and email_confirmed_at is not null;
  approved := coalesce(inv.email is not null and inv.email = my_email, false);  -- false (not null) for unconfirmed accounts

  if current_status = 'active' then return 'active'; end if;
  if current_status = 'pending' and not approved then return 'pending'; end if;

  if not approved and (select count(*) from public.board_members where board_id = inv.board_id and status = 'pending') >= 50 then
    raise exception 'This board has too many people waiting to join. Try again later.' using errcode = 'P0001';
  end if;

  insert into public.board_members (board_id, user_id, role, status, display_name, joined_at)
  values (inv.board_id, me, 'member', case when approved then 'active' else 'pending' end,
          public.user_display_name(me), case when approved then now() end)
  on conflict (board_id, user_id) do update set status = excluded.status, joined_at = excluded.joined_at;

  if approved then update public.board_invites set used_at = now() where id = inv.id; end if;
  return case when approved then 'active' else 'pending' end;
end $$;

-- Email invitations waiting for the signed-in user (shown on their home page).
create function public.my_invitations()
returns table (invite_id uuid, token text, board_id uuid, board_name text, owner_name text, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.token, b.id, b.name, b.owner_name, i.expires_at
  from public.board_invites i
  join public.boards b on b.id = i.board_id
  join auth.users u on u.id = auth.uid() and u.email_confirmed_at is not null and lower(u.email) = i.email
  where i.revoked_at is null and i.used_at is null and i.declined_at is null and i.expires_at > now()
    and not exists (select 1 from public.board_members m where m.board_id = b.id and m.user_id = auth.uid() and m.status = 'active')
  order by i.created_at desc;
$$;

create function public.decline_invitation(p_invite uuid) returns void
language sql security definer set search_path = '' as $$
  update public.board_invites i set declined_at = now()
  from auth.users u
  where i.id = p_invite and u.id = auth.uid() and lower(u.email) = i.email;
$$;

-- Boards the signed-in user has asked to join and is still waiting for.
create function public.my_join_requests()
returns table (board_id uuid, board_name text, owner_name text, requested_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.id, b.name, b.owner_name, m.requested_at
  from public.board_members m join public.boards b on b.id = m.board_id
  where m.user_id = auth.uid() and m.status = 'pending'
  order by m.requested_at desc;
$$;

-- Owner: let a pending person in.
create function public.approve_member(p_board uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_board_owner(p_board) then raise exception 'Only the board owner can approve people.' using errcode = '42501'; end if;
  update public.board_members set status = 'active', joined_at = now()
  where board_id = p_board and user_id = p_user and status = 'pending';
  if not found then raise exception 'That request is no longer waiting.' using errcode = 'P0002'; end if;
end $$;

-- Owner: decline a request or remove a member. Anyone: leave a board, or
-- cancel their own request. The owner can't be removed (delete the board instead).
create function public.remove_member(p_board uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_user <> auth.uid() and not public.is_board_owner(p_board) then
    raise exception 'Only the board owner can remove people.' using errcode = '42501';
  end if;
  delete from public.board_members where board_id = p_board and user_id = p_user and role <> 'owner';
  if not found then raise exception 'That person can''t be removed.' using errcode = 'P0002'; end if;
end $$;

-- Owner only: everyone's email address, for the Share window.
create function public.board_member_emails(p_board uuid)
returns table (user_id uuid, email text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, u.email::text
  from public.board_members m join auth.users u on u.id = m.user_id
  where m.board_id = p_board and public.is_board_owner(p_board);
$$;

-- Keep a person's name up to date on their boards (after they change it).
create function public.refresh_my_name() returns void
language sql security definer set search_path = '' as $$
  update public.board_members set display_name = public.user_display_name(auth.uid()) where user_id = auth.uid();
  update public.boards set owner_name = public.user_display_name(auth.uid()) where owner_id = auth.uid();
$$;

-- Only signed-in users may call these; helpers are for the policies only.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_board_member(uuid), public.is_board_owner(uuid),
  public.create_board(uuid, text, text, jsonb), public.create_invite(uuid, text), public.revoke_invite(uuid),
  public.invite_info(text), public.request_to_join(text), public.my_invitations(), public.decline_invitation(uuid),
  public.my_join_requests(), public.approve_member(uuid, uuid), public.remove_member(uuid, uuid),
  public.board_member_emails(uuid), public.refresh_my_name()
to authenticated;
revoke execute on function public.user_display_name(uuid) from authenticated;

-- ───────────────────────── live updates ─────────────────────────
-- Changes appear on everyone's screen without reloading (Supabase Realtime
-- respects the policies above, so people only hear about their own boards).
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['boards', 'board_members', 'tasks'] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;
      end;
    end loop;
  end if;
end $$;

-- ───────────────────────── move existing data across ─────────────────────────
-- Every account's projects become boards it owns, and its tasks become rows.
-- The old JSON rows are left in user_data untouched, as a backup.
do $$
declare
  u record;
  p record;
  t record;
  new_id uuid;
  fallback uuid;
begin
  for u in
    select d.user_id,
           coalesce((select value from public.user_data x where x.user_id = d.user_id and x.key = 'projects'), '[]') as projects,
           coalesce((select value from public.user_data x where x.user_id = d.user_id and x.key = 'tasks'), '[]') as tasks
    from (select distinct user_id from public.user_data where key in ('projects', 'tasks')) d
    where not exists (select 1 from public.boards b where b.owner_id = d.user_id)
  loop
    create temp table if not exists board_map (old_id text, new_id uuid) on commit drop;
    delete from board_map;

    for p in select value as v from jsonb_array_elements(case when jsonb_typeof(u.projects) = 'array' then u.projects else '[]' end) loop
      new_id := case when (p.v ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                     then (p.v ->> 'id')::uuid else gen_random_uuid() end;
      insert into public.boards (id, owner_id, owner_name, name, description, anchors, created_at)
      values (new_id, u.user_id, public.user_display_name(u.user_id),
              left(coalesce(nullif(trim(p.v ->> 'name'), ''), 'Untitled project'), 120),
              left(coalesce(p.v ->> 'description', ''), 500),
              case when jsonb_typeof(p.v -> 'anchors') = 'array' then p.v -> 'anchors' else '[]' end,
              coalesce((p.v ->> 'createdDate')::date, current_date))
      on conflict (id) do nothing;
      insert into public.board_members (board_id, user_id, role, status, display_name, joined_at)
      values (new_id, u.user_id, 'owner', 'active', public.user_display_name(u.user_id), now())
      on conflict do nothing;
      insert into board_map values (p.v ->> 'id', new_id);
    end loop;

    fallback := null;
    for t in select value as v, ord from jsonb_array_elements(case when jsonb_typeof(u.tasks) = 'array' then u.tasks else '[]' end) with ordinality as e(value, ord) loop
      new_id := (select m.new_id from board_map m where m.old_id = coalesce(t.v ->> 'projectId', 'project-tracker'));
      if new_id is null then
        -- A task whose project no longer exists: keep it on an "Imported tasks" board.
        if fallback is null then
          fallback := gen_random_uuid();
          insert into public.boards (id, owner_id, owner_name, name) values (fallback, u.user_id, public.user_display_name(u.user_id), 'Imported tasks');
          insert into public.board_members (board_id, user_id, role, status, display_name, joined_at)
          values (fallback, u.user_id, 'owner', 'active', public.user_display_name(u.user_id), now());
        end if;
        new_id := fallback;
      end if;
      insert into public.tasks (board_id, id, data, updated_by)
      values (new_id, left(coalesce(t.v ->> 'id', gen_random_uuid()::text), 64),
              t.v || jsonb_build_object('projectId', new_id::text, 'order', t.ord), u.user_id)
      on conflict do nothing;
    end loop;
  end loop;
end $$;
