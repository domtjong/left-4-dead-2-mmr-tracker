-- Migration: tighten winning_side to 'A' only.
-- Every writer (new-match form, importer, delete/replay) stores winners as
-- side A, and every read path (match history, dashboard, chart, verify-elo)
-- assumes it. A stray 'B' row would silently swap winners/losers in the UI
-- while the MMR replay disagreed — make the invariant real instead.
-- Run once in Supabase Dashboard → SQL Editor. Idempotent.
alter table matches drop constraint if exists matches_winning_side_check;
alter table matches add constraint matches_winning_side_check check (winning_side = 'A');
