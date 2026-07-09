-- Migration: enforce the "winner is always side A" invariant the app relies on.
-- Every writer stores winners as side A and every read path groups on it, but
-- the schema still allowed 'B'. A single stray 'B' row (manual SQL edit, future
-- import) would silently show losers as winners with negative deltas and nothing
-- would error. This makes the invariant real — the DB rejects 'B'.
-- Run once in Supabase Dashboard → SQL Editor.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'matches_winning_side_a') then
    alter table matches add constraint matches_winning_side_a check (winning_side = 'A');
  end if;
end $$;
