-- Vaiban 004: invitation emails sent by Vaiban itself (D67).
-- Run once in Supabase → SQL Editor, after 003.
--
-- Changes to email invites:
--   * The link in the email is personal and works once. It only lets in the
--     person signed in with the confirmed address it was sent to. Anyone else
--     who opens it is told it was meant for someone else and can't even ask to
--     join with it (that's what the board's share link is for). After it has
--     been used, or declined, it stops working.
--   * prepare_invite_email() is what the send-invite Edge Function calls before
--     emailing. It checks the caller owns the board and limits how often
--     emails can be sent, so the feature can't be used to spam people.

alter table public.board_invites
  add column if not exists last_sent_at timestamptz,
  add column if not exists send_count   integer not null default 0;

-- invite_info gains "for_me": null for a share link; for an email invite,
-- whether it was sent to the signed-in user's address (the address itself is
-- never revealed). "usable" is now also false once an invite is declined.
drop function if exists public.invite_info(text);
create function public.invite_info(p_token text)
returns table (board_id uuid, board_name text, owner_name text, usable boolean, my_status text, for_me boolean)
language sql stable security definer set search_path = '' as $$
  select b.id, b.name, b.owner_name,
         (i.revoked_at is null and i.used_at is null and i.declined_at is null and i.expires_at > now()),
         (select m.status from public.board_members m where m.board_id = b.id and m.user_id = auth.uid()),
         case when i.email is null then null
              else exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null and lower(u.email) = i.email) end
  from public.board_invites i join public.boards b on b.id = i.board_id
  where i.token = p_token and auth.uid() is not null;
$$;

-- Same as 003, except that an email invite only works for its own address.
create or replace function public.request_to_join(p_token text) returns text
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
  if inv.id is null or inv.revoked_at is not null or inv.used_at is not null or inv.declined_at is not null or inv.expires_at <= now() then
    raise exception 'This invite has expired or been turned off. Ask the board owner for a new one.' using errcode = 'P0001';
  end if;

  select status into current_status from public.board_members where board_id = inv.board_id and user_id = me;
  if current_status = 'active' then return 'active'; end if;

  select lower(email) into my_email from auth.users where id = me and email_confirmed_at is not null;
  approved := coalesce(inv.email is not null and inv.email = my_email, false);  -- false (not null) for unconfirmed accounts

  if inv.email is not null and not approved then
    raise exception 'This invitation was sent to a different email address. Sign in with the address it was sent to, or ask the board owner to invite this one.' using errcode = '42501';
  end if;
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

-- Called by the send-invite Edge Function with the signed-in owner's token.
-- Makes (or reuses) the email invite and returns what the email needs.
-- Limits: one email per invite per minute, 5 per invite in total, and
-- 30 invitation emails per owner per hour.
create function public.prepare_invite_email(p_board uuid, p_email text)
returns table (invite_id uuid, token text, email text, expires_at timestamptz, board_name text, inviter_name text)
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  inv record;
  sent_last_hour integer;
begin
  if p_email is null or trim(p_email) = '' then raise exception 'Enter an email address.' using errcode = '22023'; end if;
  select * into inv from public.create_invite(p_board, p_email);  -- checks ownership and the address

  select coalesce(sum(1), 0) into sent_last_hour
  from public.board_invites i where i.created_by = me and i.last_sent_at > now() - interval '1 hour';
  if sent_last_hour >= 30 then
    raise exception 'You''ve sent a lot of invitations in the last hour. Try again later.' using errcode = 'P0001';
  end if;

  update public.board_invites i
  set last_sent_at = now(), send_count = i.send_count + 1
  where i.id = inv.id and (i.last_sent_at is null or i.last_sent_at < now() - interval '1 minute') and i.send_count < 5;
  if not found then
    raise exception 'An invitation was just sent to this address. Wait a minute before sending it again (at most 5 times).' using errcode = 'P0001';
  end if;

  return query
  select inv.id, inv.token, inv.email, inv.expires_at, b.name, public.user_display_name(me)
  from public.boards b where b.id = p_board;
end $$;

revoke execute on function public.invite_info(text), public.prepare_invite_email(uuid, text) from public, anon;
grant execute on function public.invite_info(text), public.prepare_invite_email(uuid, text) to authenticated;

-- Tell the Data API about the new functions straight away (otherwise it can
-- take a while, and the app reports "Could not find the function …").
notify pgrst, 'reload schema';
