# Code Review — L4D2 MMR Tracker

Reviewed: 2026-07-08. Stack: Next.js 16 (App Router, server components + server actions), Supabase (Postgres via `@supabase/ssr`), Tailwind, Recharts, Vitest. No edge functions, no realtime, no storage buckets. All data access goes through server components / server actions using the **anon key**; there is no real auth — mutations are gated by a date-derived PIN.

---

## 1. Executive summary

The app is small, readable, and better-engineered than most hobby trackers: the Elo engine is a pure, well-tested module, every match stores `mmr_before/after/delta` for auditability, and there are recompute/verify scripts. The single most important issue is that **RLS is disabled on every table while the anon key ships in the client bundle**, so anyone who visits the site can extract the key and read/write/delete the entire database directly through PostgREST — the PIN only guards the app's own server actions, not the database. The dominant theme of the remaining findings is **non-atomic, race-prone data mutation**: both logging a match and (especially) deleting one perform multi-step read-modify-write sequences over HTTP with no transaction, including a full wipe-and-rewrite of `match_players` — which is the most likely mechanism behind the two anomalies you observed (a deletion that appeared to target the wrong record, and a winner showing negative MMR). Correctness of the Elo math itself is solid.

---

## 2. Findings table

| # | Severity | Category | Location | Description |
|---|----------|----------|----------|-------------|
| 1 | Critical | Security / RLS | `supabase/schema.sql:7-9`, `utils/supabase/client.ts:6` | RLS off on all tables; anon key is in the public bundle → full public read/write/delete via PostgREST, bypassing the PIN entirely |
| 2 | High | Correctness | `app/(app)/matches/actions.ts:52-139` | Match deletion = non-transactional delete → full wipe of `match_players` → chunked reinsert → per-player updates; a crash, serverless timeout, or concurrent write corrupts history |
| 3 | High | Correctness | `app/(app)/matches/new/actions.ts:69-146` | Lost-update race: `logMatch` reads `current_mmr`, computes, then writes; two near-simultaneous submissions (or one racing a delete) compute from stale ratings |
| 4 | High | Security / Auth | `lib/pin.ts:7-16` | The mutation "PIN" is today's date (`ddmmyy`) — a public formula committed to the repo; no rate limiting; no server-side secret |
| 5 | Medium | Correctness | `app/(app)/matches/new/actions.ts:104-116`, `components/matches/NewMatchForm.tsx:77,105` | Backdated / timezone-shifted `played_at` makes stored MMR history diverge from the canonical replay order; the next deletion silently rewrites deltas across the log |
| 6 | Medium | Data loss (latent) | `app/(app)/matches/actions.ts:59-65` vs `:117` | Replay loads `matches` without pagination (PostgREST 1000-row cap) but then wipes **all** of `match_players`; beyond 1000 matches, deletion permanently destroys history |
| 7 | Medium | Data / display | `app/(app)/matches/page.tsx:46`, `app/(app)/page.tsx:63`, `app/(app)/chart/page.tsx:49`, `scripts/verify-elo.ts:62` | Every read path hardcodes side `A` = winners while the schema allows `winning_side = 'B'`; one `'B'` row would silently invert the displayed result (the only in-code way a "winner" can show a negative delta) |
| 8 | Medium | Security / hygiene | `app/login/page.tsx:32-53`, `app/notes/page.tsx:5`, `app/protected/page.tsx` | Leftover template auth: open email/password **sign-up endpoint** live in prod; `/notes` queries a table that has no migration; dead `/protected` page |
| 9 | Medium | TypeScript | `utils/supabase/*.ts`, e.g. `app/(app)/matches/page.tsx:43` | Supabase client is untyped (no generated `Database` types); joined relations coerced with `as unknown as` casts |
| 10 | Medium | Migrations | `supabase/` dir; git `5649abd` → `916cb28` | No migration tooling; numbering collision (`003_app_logs.sql` existed, was removed; `003_entered_by.sql` reuses 003); `app_logs` table may exist in the live DB with no schema file |
| 11 | Low | Security | git history `fac9275` (removed in `f10cc93`) | `.env.vercel.tmp` with the anon key was committed; harmless once RLS is on, but today the anon key is a write credential — rotate it when fixing #1 |
| 12 | Low | Correctness | `lib/db.ts:16-32` | `fetchAllRows` page-walk is not a snapshot; rows can be skipped/duplicated if a write lands mid-pagination (feeds #2) |
| 13 | Low | Docs drift | `supabase/schema.sql:5`, `PROJECT.md §1a` vs `lib/mmr.ts:9` | Docs say K-factor 32; code is 64 |
| 14 | Low | Error handling | `app/(app)/matches/new/page.tsx:9-12` | `{ data: players }` destructure ignores `error`; on failure the form silently renders with an empty roster (typos then create guest players) |
| 15 | Low | Validation | `app/(app)/matches/new/actions.ts:106-114` | `playedAt`, `winScore`, `loseScore` not validated server-side (no range/order/date checks) |
| 16 | Low | Tooling | repo root | No CI, no ESLint config or `lint` script, no `.env.example`; `.gitignore` covers `.env*.local` but not plain `.env` |
| 17 | Low | Security | `scripts/run-migration.ts:54`, `scripts/run-schema.ts:31` | `ssl: { rejectUnauthorized: false }` disables TLS certificate verification for DB connections |
| 18 | Low | Dead code | `components/dashboard/MmrChart.tsx`, `components/ui/chart.tsx`, `components/tutorial/*`, `components/DeployButton.tsx` | Unimported template/dead components (the `dangerouslySetInnerHTML` in `ui/chart.tsx` was checked: dev-controlled CSS only, safe — and unused) |

Verified non-findings: the Elo math (`lib/mmr.ts`) cannot produce a negative delta for the winning side (`round(k·(1−E))` with `E<1` is ≥ 0); key exposure is limited to the anon key (service role key is only read from gitignored `.env.local` by local scripts); React escapes all user-entered text (`note`, `entered_by`, names), so no XSS surface; `match_players` has indexes on both FK columns.

---

## 3. Detailed findings

### 3.1 About the two reported incidents

**"Deletion of a game targeted the wrong record" (intermittent).** The delete itself is precise — `MatchHistory` passes the row's own `m.id` and the action deletes `.eq("id", id)` ([actions.ts:52](app/(app)/matches/actions.ts)). What is *not* precise is everything after: the action then wipes the **entire** `match_players` table and rebuilds it (finding #2). If that rebuild is interrupted, or a match is being logged concurrently (the replay data was loaded before the new match's rows committed, then the wipe removes them), an *unrelated* match is left in the `matches` table with **no roster rows** — it renders with empty winner/loser lists and drops out of MMR. From the UI that is indistinguishable from "the wrong game got deleted." Additionally, any delete rewrites the deltas of *other* matches whenever stored history had diverged from replay order (finding #5), which also reads as "a different record was touched."

**"Someone who won had negative MMR for that match."** No code path can write a negative delta for side A, and every writer (form, import, replay) stores winners as side A. The realistic causes are (a) the teams were entered swapped — the winning team typed into the Losers column — which the repo itself corroborates: commit `5649abd` (Jul 8, the same night) adds a confirm step and a "winner score below loser score" guard specifically to catch this; or (b) rows left inconsistent by an interrupted recompute (#2). Your fix — delete both games and re-enter them — is exactly what repairs either cause, because each delete triggers a full, correct replay. One residual risk to keep in mind: finding #7 means that if a `winning_side='B'` row ever appears (manual SQL edit, future tooling), the UI will confidently display the losers as winners with negative deltas and nothing will error.

### 3.2 Critical — Database is publicly writable (RLS off + anon key in the bundle)

`supabase/schema.sql:7-9` documents the choice:

```sql
-- RLS NOTE: RLS is intentionally OFF for the MVP (private group).
-- With RLS off, anyone holding the project URL + anon key can read/write these
-- tables. Acceptable for a private group MVP. Turn RLS on before any public use.
```

But the app **is** public use: it's deployed to Vercel, and `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are compiled into the client JavaScript by definition of the `NEXT_PUBLIC_` prefix (`utils/supabase/client.ts:3-7`). Concrete failure: any visitor opens DevTools, copies the URL and anon key from the bundle (or from git history, finding #11), and runs
`curl -X DELETE "https://<ref>.supabase.co/rest/v1/matches?id=neq.0" -H "apikey: <anon>"` — the entire match log is gone, no PIN involved. The PIN check lives only inside the server actions; PostgREST is a second, unguarded front door. The same door allows silent tampering (editing `current_mmr`), which would also present as "MMR calculated wrong."

**Fix (keeps the current no-login UX):**
1. Enable RLS on `players`, `matches`, `match_players` with a read-only policy for `anon` (`create policy "public read" on matches for select using (true);` etc.) and **no** insert/update/delete policies.
2. In the server-side client only (`utils/supabase/server.ts` or a dedicated admin client used by the two actions), switch to a `SUPABASE_SERVICE_ROLE_KEY` env var (not `NEXT_PUBLIC_`). Server actions run only on the server, so writes keep working; the browser key becomes read-only.
3. Rotate the anon key afterwards (it's in git history).

### 3.3 High — Delete/recompute is a destructive multi-step sequence with no transaction

`app/(app)/matches/actions.ts` does, as separate HTTP calls: delete match (:52) → read matches/match_players/players (:59-70) → **delete every row of `match_players`** (:117) → reinsert in 500-row chunks (:123-129) → update each player's `current_mmr` in a `Promise.all` of individual updates (:132-139).

```ts
// 4. Replace all match_players with the recomputed rows.
const { error: wipeErr } = await db.from("match_players").delete().not("id", "is", null);
...
for (let j = 0; j < newRows.length; j += 500) {
  const { error: insErr } = await db.from("match_players").insert(newRows.slice(j, j + 500));
```

Failure scenarios, all reachable in production:
- **Serverless timeout / crash between wipe and last insert:** the whole match history's roster rows are partially gone; `current_mmr` never written. (Vercel function duration limits make this a real risk as the log grows.)
- **Concurrent `logMatch`:** its `match_players` rows commit after the replay data was read → the wipe deletes them, the reinsert doesn't restore them → ghost match (see §3.1). Its `players.update` calls then interleave with the delete's, so standings match neither timeline.
- **Two concurrent deletes:** both wipe, both reinsert → duplicate-key failures on `unique (match_id, player_id)` mid-loop, leaving a half-rebuilt table.

**Fix:** move the replay into a single Postgres function (`create function delete_match_and_replay(match_id uuid) ... security definer`) called via `db.rpc(...)` — one statement, one transaction, and it also fixes #6 and #12 because the replay happens in SQL, not over paginated HTTP reads. If you stay in TypeScript: stop wiping the table — delete only the target match (cascade already removes its rows) and `upsert` the recomputed rows with `onConflict: "match_id,player_id"`, then take a Postgres advisory lock (or a single-row `for update` lock) so log/delete are serialized. `deleteMatch` and `logMatch` should share that lock.

### 3.4 High — `logMatch` lost-update race

`app/(app)/matches/new/actions.ts:69-72` reads `current_mmr`, computes deltas in JS, and writes back at :137-141. Two submissions racing (double-device entry after a session, or racing a delete's step 5) both read the same pre-match ratings; the second match's stored `mmr_before/delta` is computed as if the first never happened, and one `players.update` overwrites the other. The stored chain (`mmr_after` of game N ≠ `mmr_before` of game N+1) silently diverges until the next full replay rewrites it — another "MMR changed by itself" source. The same RPC/advisory-lock fix as §3.3 covers this.

### 3.5 High — PIN provides no real protection

`lib/pin.ts:7-11`: the PIN is `ddmmyy` of today's date, and the formula is in the public repo. Anyone who finds the site can compute it and use the real UI to log or delete matches; there is also no rate limit on attempts. Given finding #1 the DB is open anyway, but after RLS is fixed this becomes the only write gate. **Fix:** compare against a `MATCH_PIN` env var (server-only), or move to Supabase auth with an allowlist. Even keeping the "shared secret" model, it must not be derivable from the source.

### 3.6 Medium — Backdating and date handling desynchronize history from replay order

The canonical order is `(played_at, created_at, id)` (replay, `actions.ts:62-65`; `scripts/recompute.ts`). But `logMatch` **appends** using current ratings no matter what `playedAt` is (`new/actions.ts:109`). Enter a forgotten game from last week and its stored deltas are computed as if it were the newest game; every stored row is now inconsistent with the canonical order, and the *next* deletion (full replay) rewrites deltas across the intervening matches — users see numbers change on games nobody touched.

Compounding it, `NewMatchForm.tsx:77` defaults the date to `new Date().toISOString().slice(0, 10)` (the **UTC** date) and :105 parses the date-only string as UTC midnight. For an Australian group (UTC+10/11), any match logged before ~10–11 am local gets *yesterday's* date, so morning-after entries are unintentionally backdated and same-evening games can straddle two `played_at` values, inverting their replay order relative to actual play order.

**Fix:** (a) when `playedAt` is earlier than the latest match, run the same replay used by delete (or reject backdating); (b) compute the default date client-side in local time (`en-CA` locale format or manual `getFullYear/getMonth/getDate`) and decide explicitly what timezone `played_at` means.

### 3.7 Medium — 1000-row cap + full wipe = data loss at scale

`actions.ts:59-65` fetches `matches` with no `.range()` — Supabase caps the response at 1000 rows — while `match_players` correctly uses `fetchAllRows`. Today (168 matches) this is fine; at >1000 matches the replay silently drops the tail, and because step 4 wipes **all** of `match_players`, every match beyond the cap permanently loses its roster on the next delete. A latent time bomb rather than a live bug — but the failure mode is unrecoverable data loss, so fix it alongside §3.3 (the SQL-side replay removes the cap entirely).

### 3.8 Medium — "Side A = winners" is an unchecked invariant

The schema allows `winning_side in ('A','B')` (`schema.sql:28`), and the replay honors it (`actions.ts:102`), but every read path hardcodes A = winners: `matches/page.tsx:46`, dashboard `page.tsx:63`, `chart/page.tsx:49`, the delete log (`actions.ts:47-48`), and `verify-elo.ts:62`. One `'B'` row — from a manual fix in the SQL editor, a future import, or a bug — and the UI swaps winners/losers with no error while the MMR replay disagrees with the display. **Fix:** either add `check (winning_side = 'A')` and drop `'B'` (making the invariant real), or select `winning_side` and use it when grouping sides. The first is one line and matches how the app actually works.

### 3.9 Medium — Leftover template auth surface

`app/login/page.tsx:32-53` exposes working email/password **sign-up** against your Supabase project in production; `/protected` is a tutorial page; `app/notes/page.tsx:5` queries a `notes` table that exists in no schema file (and ignores the error, rendering `null`). None of it is used by the app. Attackers can create arbitrary auth users (spam, email-sending via confirmation mails). **Fix:** delete `app/login`, `app/protected`, `app/notes`, `app/auth/callback`, `components/AuthButton.tsx`, `components/tutorial/*`, `components/DeployButton.tsx` (and disable email signups in the Supabase dashboard) until real auth is designed.

### 3.10 Medium — Untyped database layer

`createServerClient` / `createBrowserClient` are called without the generated `Database` generic, so every `.select()` is stringly-typed and joined relations need double casts (`matches/page.tsx:43`: `mp.players as unknown as { name: string } | null`). A renamed column becomes a runtime `undefined`, not a compile error. **Fix:** `supabase gen types typescript` into `lib/database.types.ts`, pass it to both client factories, and the casts disappear (the join is then typed as an object, not an array, when the FK is unique).

### 3.11 Medium — Migration hygiene

Migrations are loose SQL files run by hand/script; `003` was used twice (`003_app_logs.sql`, later removed in commit `916cb28`, and `003_entered_by.sql`), so the live DB likely contains an `app_logs` table that no file in the repo describes, and there's no record of what has been applied. **Fix:** adopt `supabase migration` (CLI) or at minimum a `NNN_` sequence with an applied-migrations log table; re-dump the current schema as the baseline.

### 3.12 Low findings, briefly

- **Anon key in git history** (`fac9275`, removed in `f10cc93`) — rotate keys when enabling RLS; history is forever.
- **`fetchAllRows` snapshot** (`lib/db.ts:16-32`) — pages can shift under concurrent writes; solved for the critical path by the SQL-side replay.
- **K-factor drift** — `schema.sql:5` and `PROJECT.md` say 32; `lib/mmr.ts:9` is 64. Update the docs (the code and tests agree on 64).
- **Swallowed error** — `matches/new/page.tsx:9-12` ignores the players-query error; use `unwrap` like the other pages, otherwise a transient failure turns typo'd names into permanent guest players.
- **Server-side validation** — `logMatch` doesn't check `winScore/loseScore` (non-negative ints, winner ≥ loser) or that `playedAt` parses; the score-swap guard exists only client-side.
- **Tooling** — no CI (no `.github/`), no ESLint config or `lint` script, no `.env.example`; add plain `.env` to `.gitignore`.
- **`rejectUnauthorized: false`** in `scripts/run-migration.ts:54` / `run-schema.ts:31` — use Supabase's CA cert or `sslmode=require` with verification; these connections carry the DB password.
- **Dead code** — `components/dashboard/MmrChart.tsx` (and its `components/ui/chart.tsx` dependency) are unimported; the `dangerouslySetInnerHTML` there is dev-controlled CSS (verified safe, standard shadcn) but simplest to delete with the rest.

---

## 4. What's done well

- **The Elo engine is exemplary for the size of the project**: pure functions, no I/O, 14 focused unit tests including zero-sum and symmetry properties (`lib/mmr.ts`, `lib/mmr.test.ts`).
- **Auditable rating history** — storing `mmr_before/after/delta` per `match_players` row makes the whole log recomputable and verifiable, and `scripts/verify-elo.ts` / `scripts/recompute.ts` actually exploit that.
- **Writes go through server actions**, not client-side Supabase calls — the right shape; it just needs RLS underneath it.
- **Deliberate infrastructure helpers**: `unwrap` (no silently-swallowed query errors on read paths), `fetchAllRows` (explicit answer to the 1000-row cap), structured JSON logging with event names for Vercel log filtering.
- **Thoughtful UX guards born from real incidents**: the confirm step that spells out who gains/loses MMR, and the winner-score-below-loser-score warning.
- Strict TypeScript, clean component decomposition (server pages fetch, client components present), and honest comments that state trade-offs (`RLS NOTE`, replay rationale).

---

## 5. Prioritized remediation plan

**This week — close the open door and stop the corruption:**
1. Enable RLS: public `SELECT` policies on the three tables, no write policies; move server actions to a server-only service-role (or dedicated) key; rotate the anon key (§3.2).
2. Replace the wipe-and-reinsert recompute with a single transactional SQL function called via `rpc`, used by both delete and (for backdated dates) insert; this simultaneously fixes the race conditions, the 1000-row time bomb, and the pagination-snapshot issue (§3.3, §3.4, §3.7).
3. Replace the date-formula PIN with a server-side secret env var (§3.5).
4. Delete the template auth pages and disable email signups (§3.9).

**This month — make correctness durable:**
5. Fix date handling: local-time default date, explicit backdating behavior (§3.6).
6. Add `check (winning_side = 'A')` or honor `winning_side` in read paths (§3.8).
7. Generate and adopt Supabase `Database` types (§3.10).
8. Add tests around the replay logic (pure-function extract of the replay loop is already 90% there in `actions.ts:96-114`) and server-side input validation for `logMatch`.
9. Set up CI (typecheck + vitest + lint) and `.env.example`.

**Eventually:**
10. Proper migration workflow (supabase CLI), baseline the live schema, reconcile `app_logs`.
11. Real auth + gangs model (already planned in PROJECT.md) — revisit RLS policies per-gang at that point.
12. Delete dead template/chart components; fix K-factor docs.
