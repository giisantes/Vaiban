-- Vaiban – milestones (D79). Run ONCE in Supabase → SQL Editor, after 006.
--
-- Each board keeps its milestones as a small list on the board itself
-- (like the deliverable links), and each task says which milestone it
-- belongs to inside its own data. Row-level security is unchanged: the
-- board's active members can read and change them, nobody else can.

alter table public.boards
  add column if not exists milestones jsonb not null default '[]'
  check (jsonb_typeof(milestones) = 'array' and jsonb_array_length(milestones) <= 50 and pg_column_size(milestones) < 50000);

notify pgrst, 'reload schema';
