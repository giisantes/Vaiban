-- Vaiban 005: prompt library and AI skills library (D69–D71).
-- Run once in Supabase → SQL Editor → New query, after 003 and 004.
--
-- Two tables, with the same sharing rules:
--   prompts    – a prompt, its result, tags, the AI tool, and the tasks it was used for
--   ai_skills  – a reusable AI skill: name, overview, instructions, the AI it's used with
--
-- Each item is either PRIVATE (board_id is empty: only its author sees it) or
-- belongs to a BOARD (every active member of that board sees and edits it –
-- the team's shared library). Being on a board gives no access to anyone's
-- private items or to other boards' items. As with tasks, the database
-- enforces this itself (row-level security), not the app.

create table public.prompts (
  id          uuid        primary key default gen_random_uuid(),
  board_id    uuid        references public.boards (id) on delete cascade,     -- null = private
  owner_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text        not null default '',
  name        text        not null check (char_length(name) between 1 and 120),
  body        text        not null check (char_length(body) between 1 and 20000),  -- the prompt itself
  result      text        not null default '' check (char_length(result) <= 50000),
  tags        jsonb       not null default '[]' check (jsonb_typeof(tags) = 'array' and jsonb_array_length(tags) <= 20),
  task_ids    jsonb       not null default '[]' check (jsonb_typeof(task_ids) = 'array' and jsonb_array_length(task_ids) <= 50),
  ai_tool     text        check (ai_tool is null or char_length(ai_tool) <= 40),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid        default auth.uid()
);
create index prompts_board on public.prompts (board_id);
create index prompts_owner on public.prompts (owner_id);

create table public.ai_skills (
  id           uuid        primary key default gen_random_uuid(),
  board_id     uuid        references public.boards (id) on delete cascade,    -- null = private
  owner_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  author_name  text        not null default '',
  name         text        not null check (char_length(name) between 1 and 120),
  overview     text        not null default '' check (char_length(overview) <= 2000),
  instructions text        not null default '' check (char_length(instructions) <= 50000),
  tags         jsonb       not null default '[]' check (jsonb_typeof(tags) = 'array' and jsonb_array_length(tags) <= 20),
  ai_tool      text        check (ai_tool is null or char_length(ai_tool) <= 40),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid        default auth.uid()
);
create index ai_skills_board on public.ai_skills (board_id);
create index ai_skills_owner on public.ai_skills (owner_id);

-- Who may see an item: its author while it is private, or any active member
-- of the board it belongs to.
create function public.can_use_library_item(p_board uuid, p_owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case when p_board is null then p_owner = auth.uid()
              else public.is_board_member(p_board) end;
$$;

-- Stamps the author's name, the update time and who changed it; the author
-- (owner_id) can never be changed, and only the author can make a shared item
-- private again (so nobody can take a team prompt away into their own library).
create function public.library_item_stamp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
    new.author_name := public.user_display_name(auth.uid());
    new.created_at := now();
  else
    if new.owner_id is distinct from old.owner_id or new.author_name is distinct from old.author_name or new.created_at is distinct from old.created_at then
      raise exception 'The author of a library item can''t be changed.' using errcode = '42501';
    end if;
    if new.board_id is null and old.board_id is not null and old.owner_id <> auth.uid() then
      raise exception 'Only the author can make a shared item private.' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['prompts', 'ai_skills'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create trigger stamp before insert or update on public.%I for each row execute function public.library_item_stamp()', t);
    execute format('create policy "Read own or board items" on public.%I for select to authenticated using (public.can_use_library_item(board_id, owner_id))', t);
    execute format('create policy "Add own or board items" on public.%I for insert to authenticated with check (owner_id = auth.uid() and (board_id is null or public.is_board_member(board_id)))', t);
    execute format('create policy "Change own or board items" on public.%I for update to authenticated using (public.can_use_library_item(board_id, owner_id)) with check (public.can_use_library_item(board_id, owner_id))', t);
    execute format('create policy "Delete own or board items" on public.%I for delete to authenticated using (public.can_use_library_item(board_id, owner_id))', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

revoke execute on function public.can_use_library_item(uuid, uuid), public.library_item_stamp() from public, anon;
grant execute on function public.can_use_library_item(uuid, uuid) to authenticated;

-- Live updates for teammates (same as 003).
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['prompts', 'ai_skills'] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;
      end;
    end loop;
  end if;
end $$;

-- Tell the Data API about the new tables straight away.
notify pgrst, 'reload schema';
