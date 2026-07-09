-- Migration: lock down write access. Enable RLS with public READ-ONLY policies.
-- Server actions use the service-role key (SUPABASE_SERVICE_ROLE_KEY), which
-- bypasses RLS, so logging/deleting matches keeps working. The browser's anon
-- key — which ships in the client bundle — becomes read-only, closing the
-- "anyone can curl DELETE the whole database" hole.
--
-- ⚠ PREREQUISITE: SUPABASE_SERVICE_ROLE_KEY must ALREADY be set in the deployed
-- environment (Vercel) and the new action code deployed BEFORE you run this, or
-- match logging/deletion will break the moment RLS turns on.
--
-- Run once in Supabase Dashboard → SQL Editor.

alter table players       enable row level security;
alter table matches       enable row level security;
alter table match_players enable row level security;

-- Public read for everyone (anon + authenticated). No insert/update/delete
-- policies exist, so RLS denies all writes except the service role, which is
-- exempt from RLS by design.
drop policy if exists "public read players"       on players;
drop policy if exists "public read matches"       on matches;
drop policy if exists "public read match_players" on match_players;

create policy "public read players"       on players       for select using (true);
create policy "public read matches"       on matches       for select using (true);
create policy "public read match_players" on match_players for select using (true);
