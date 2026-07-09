# L4D2 MMR Tracker — Project Master Doc

Single source of truth for what we're building and why. Keep this current as decisions change.

---

## 1. Overview

A web app to track **matchmaking rating (MMR)** for a group that plays **Left 4 Dead 2 Versus (4v4 PvP)**. L4D2 has no official rating system, so we compute our own Elo-style MMR from the matches the group logs by hand.

Core loop: someone logs a match → each player's MMR updates → the group can chart MMR over time and browse stats.

**Design reference:** Figma — https://www.figma.com/design/icS5AkLWSYdj5iUMPiKAT4/L4D2-Design?node-id=0-1

---

## 1a. Status — what's built (updated 2026-07-03)

MVP is functionally complete and being deployed to Vercel. Highlights:

**Done**
- **Team Elo engine** (`lib/mmr.ts`) — base 1000, K 64, team-average expected score, symmetric. 14 passing unit tests (`lib/mmr.test.ts`).
- **Historical import** — the old spreadsheet (`l4d2csv.xlsx`) is cleaned and imported: **24 players, 168 matches**, first counted game **2021-05-19**. Exclusions applied: pre-cutoff games, `x`-marked voids (incl. duplicate tjong1/pratik1), custom/non-official maps, duplicate-player games. Scripts: `scripts/import-matches.ts`, cleaning in a Python pass.
- **New Match form** (`/matches/new`) — 4v4, guest-adds at base MMR, map, date, **round scores + free-text note** (scores stored for display, not used in MMR), runs Elo and persists on save.
- **MMR chart** (`/chart`) — multi-player line chart over match history + standings.
- **Match history** (`/matches`) — scrollable, filter by player/map; expandable rows show per-player deltas, team **total + average** MMR going in, pre-game win chance, score and note. **Delete a match** with a confirm modal → full MMR replay to keep history consistent.
- **Home dashboard** (`/`) — total matches, highest win rate, animated **Map spotlight** carousel (best/worst per map), **Matchup preview** (pick two teams → projected MMR gain/loss before logging), **Top movers**, and a **Recent matches** card mirroring the history detail.
- **Data integrity** — `scripts/verify-elo.ts` confirms stored deltas match the Elo engine exactly; `scripts/recompute.ts` rebuilds the whole log deterministically in `(played_at, created_at, id)` order (the same order deletes use).
- Responsive shell: desktop `Sidebar`, mobile `BottomNav`.

**Deferred / next**
- Real auth + team membership (RLS is off; single shared dataset for now).
- Per-player login → replace the mocked "Current MMR" card.
- Score differential in the MMR formula (scores are captured but display-only).
- Per-map analytics deep-dive, seasons.

---

## 2. Users & data ownership

- **Team/group shared dataset.** The group of players shares one dataset — everyone logs into shared campaigns/matches. Not per-user private silos.
- Backend is **Supabase (Postgres) from day one**, real DB even for the MVP flow.
- Auth: needed eventually so the group signs in to a shared team, but it is **not** the MVP flow (see §5). For MVP, assume a single shared team / dataset; wire real auth + team membership right after.

---

## 3. Domain model

Entities (help-me-model was requested — this is the proposed model, open to change):

- **Player** — an individual person. Every player has their own MMR that moves each match.
  - Roster is **mostly fixed with occasional guests**. Guests get added ad hoc and **start at the base MMR** (see §4).
  - Fields: `id`, `name` (display, unique within team), `current_mmr`, `is_guest`, `created_at`.
- **Match** — one logged 4v4 Versus game.
  - Inputs captured today: **4 players per side, the map, and win/loss**. No score differential yet (see §4 note).
  - Fields: `id`, `map`, `winning_side` (`A` | `B`), `played_at`, `created_at`, `created_by`.
- **MatchPlayer** — join row: which player was on which side of a match, plus the MMR before/after so history is auditable and the chart is exact.
  - Fields: `id`, `match_id`, `player_id`, `side` (`A` | `B`), `mmr_before`, `mmr_after`, `delta`.
- **Map** — an L4D2 campaign name used as a match's map/label (Dead Center, Dark Carnival, etc.). Can start as an enum/string; promote to its own table if we want per-map stats.

Notes:
- "Campaign" in the sidebar = **the L4D2 official campaign played as the match's map**, not a season/series. Revisit if we want season groupings later.
- **Every individual player has an MMR**; both sides come from the **same shared pool** (any name can be on either team any match), so opponents' MMR also updates.
- Keep the **raw match log immutable**. MMR is derived — storing `mmr_before/after` per MatchPlayer lets us recompute the whole history if we change the formula.

---

## 4. MMR formula

### Decision: replace the old ad-hoc formula with standard team Elo.

The formula used in the old spreadsheet was:

```
ABS((LoseTeamMMR*4) - (WinTeamMMR*3)) / (100 * (LoseTeamMMR / WinTeamMMR))
```

This is ad hoc, not symmetric, and hard to reason about. We're moving to **standard team Elo**, which is well-understood, symmetric (winner gains what loser loses at the team level), and easy to tune.

### Recommended Elo (default constants)

- **Base rating:** `1000` — everyone (and every new guest) starts here. Matches the "everyone started from the same number" history.
- **K-factor:** `64` (double the standard 32, so ratings move faster on a small match log). Higher = ratings move faster; lower = more stable. Tunable in one constant.
- **Team rating** = average of the 4 players' current MMR on that side.
- **Expected score** for a side:
  ```
  E_side = 1 / (1 + 10 ^ ((opponentTeamAvg - ownTeamAvg) / 400))
  ```
- **Update** (same delta magnitude for all 4 players on a side):
  ```
  actual = 1 if side won else 0
  delta  = K * (actual - E_side)
  newMMR = round(oldMMR + delta)
  ```

Winners gain more when they beat a higher-rated team; less when they beat a weaker one. Symmetric across the two teams.

### Score differential — deferred

No score diff is captured today. Adding a margin-of-victory multiplier later is possible but **would skew existing ratings if applied retroactively**. Decision: **skip for now**; because MMR is recomputed from the raw match log, we can re-derive everything if we later add a score field — no data loss, just a re-run.

---

## 5. Scope — MVP

**Goal: make ONE flow fully work end-to-end first:** `Log match → MMR chart updates`.

MVP includes:
1. **New Match form** — pick 4 players per side (from roster; add guest inline at base MMR), pick map, mark win/loss, save.
2. On save: run Elo, write the `Match` + 4×`MatchPlayer` rows with `mmr_before/after`, update each `Player.current_mmr`. Real Supabase writes.
3. **MMR chart** — **select one or more players to plot**; each selected player is a line of their MMR over match history.
4. Enough of **Stats table** to sanity-check numbers (current MMR per player, W/L).

Explicitly **not** in MVP (do after): full auth + team creation/invites, data import, per-map analytics, score differential, season/campaign groupings.

---

## 6. Existing data

- History exists in a spreadsheet elsewhere but **import is skipped for MVP** — start fresh in the app so we can prove the schema first.
- Import comes later; we'll map spreadsheet columns to the `Match` / `MatchPlayer` schema and write an importer once the model is stable.

---

## 7. Tech stack

- **Next.js** (App Router) + **React 18** + **TypeScript**
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) — Postgres + auth
- **Tailwind CSS** + **shadcn/ui** + **lucide-react** icons
- Charts: TBD (recommend **Recharts** — pairs well with shadcn chart primitives)

---

## 8. Screens / routes (from sidebar)

| Nav item    | Route (proposed) | Purpose                                        | MVP?      |
|-------------|------------------|------------------------------------------------|-----------|
| Home        | `/`              | Dashboard / welcome                            | partial   |
| New match   | `/matches/new`   | Log a 4v4 match                                | **yes**   |
| Campaigns   | `/campaigns`     | Browse by L4D2 map                             | later     |
| Stats table | `/stats`         | Per-player MMR + W/L table                     | partial   |
| MMR chart   | `/chart`         | Select players → plot MMR over time            | **yes**   |

---

## 9. Proposed Supabase schema (starting point)

```sql
-- players
id            uuid pk default gen_random_uuid()
name          text not null
current_mmr   integer not null default 1000
is_guest      boolean not null default false
created_at    timestamptz default now()

-- matches
id            uuid pk default gen_random_uuid()
map           text not null
winning_side  text not null check (winning_side in ('A','B'))
played_at     timestamptz not null default now()
created_at    timestamptz default now()

-- match_players
id            uuid pk default gen_random_uuid()
match_id      uuid references matches(id) on delete cascade
player_id     uuid references players(id)
side          text not null check (side in ('A','B'))
mmr_before    integer not null
mmr_after     integer not null
delta         integer not null
```

Constants live in one place in code (e.g. `lib/mmr.ts`): `BASE_MMR = 1000`, `K_FACTOR = 64`.

---

## 10. Open questions / future

- Confirm base rating (`1000`) and K-factor (`64`) — change before real data piles up.
- Auth + team model: one global team for now; multi-team later? (affects RLS design).
- Score differential: add margin-of-victory multiplier later, then recompute.
- Spreadsheet import: get format, write importer.
- Per-map stats, seasons/campaign groupings, guest→regular promotion.

---

## 11. Conventions

- MMR is **always derived** from the raw match log. Never edit `current_mmr` by hand; re-run the recompute.
- Store `mmr_before/after/delta` on every `match_player` so history is auditable and the chart needs no recomputation to render.
- Keep MMR math in one module (`lib/mmr.ts`) with pure, unit-testable functions.
