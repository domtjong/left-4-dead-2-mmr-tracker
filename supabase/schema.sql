-- L4D2 MMR Tracker — database schema
-- Run in Supabase Dashboard → SQL Editor. Keep this file as the source of truth.
-- See PROJECT.md §4 (Elo) and §9 (schema).
--
-- Constants (mirrored in code lib/mmr.ts): BASE_MMR = 1000, K_FACTOR = 64.
--
-- RLS NOTE: RLS is intentionally OFF for the MVP (private group).
-- With RLS off, anyone holding the project URL + anon key can read/write these
-- tables. Acceptable for a private group MVP. Turn RLS on before any public use.

-- ---------------------------------------------------------------------------
-- players: one row per person. Every player has their own MMR.
-- ---------------------------------------------------------------------------
create table if not exists players (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null unique,
  current_mmr  integer     not null default 1000,
  is_guest     boolean     not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- matches: one row per logged 4v4 Versus game.
-- ---------------------------------------------------------------------------
create table if not exists matches (
  id            uuid primary key default gen_random_uuid(),
  map           text        not null,
  -- Winners are always stored as side A (form, import, and replay all write 'A',
  -- and every read path assumes it), so the constraint enforces that invariant.
  winning_side  text        not null check (winning_side = 'A'),
  played_at     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  win_score     integer,     -- winning team's round score (display only, not in MMR)
  lose_score    integer,     -- losing team's round score
  note          text         -- free-text note per game (e.g. "X left last round")
);

-- ---------------------------------------------------------------------------
-- match_players: join row. Which player was on which side, plus the MMR
-- before/after so history is auditable and the chart needs no recomputation.
-- ---------------------------------------------------------------------------
create table if not exists match_players (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid    not null references matches(id) on delete cascade,
  player_id   uuid    not null references players(id),
  side        text    not null check (side in ('A', 'B')),
  mmr_before  integer not null,
  mmr_after   integer not null,
  delta       integer not null,
  unique (match_id, player_id)
);

-- Helpful indexes for the chart / stats queries.
create index if not exists match_players_player_id_idx on match_players (player_id);
create index if not exists match_players_match_id_idx  on match_players (match_id);
create index if not exists matches_played_at_idx        on matches (played_at);
