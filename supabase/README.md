# Database migrations

No migration tooling yet — these are plain SQL files applied **by hand** in the
Supabase Dashboard → SQL Editor, in numeric order. `schema.sql` is the baseline
(fresh project); the numbered files are incremental changes on top of it.

Apply a file once. All are written to be safe to re-run (`if not exists` /
`if exists` / guarded blocks) where practical.

## Ledger — apply in this order

| File | What it does | Applied to live DB |
|------|--------------|--------------------|
| `schema.sql` | Baseline: `players`, `matches`, `match_players`, indexes | ✅ |
| `002_scores_notes.sql` | `matches.win_score`, `lose_score`, `note` | ✅ |
| `003_entered_by.sql` | `matches.entered_by` (who logged the match) | ✅ |
| `004_winning_side_a.sql` | `check (winning_side = 'A')` invariant | ✅ |
| `005_rls.sql` | Enable RLS + public read-only policies (writes via service role) | ✅ |
| `006_drop_app_logs.sql` | Drop the orphaned `app_logs` table | ⬜ pending |

> `003_app_logs.sql` was an earlier `003` (durable DB logging) that was reverted
> and deleted. It may have created an `app_logs` table on the live DB — that's
> what `006` cleans up.

## Security model (after `005`)

- The browser ships the **anon key**; RLS makes it **read-only**.
- Match writes go through server actions using the **service-role key**
  (`SUPABASE_SERVICE_ROLE_KEY`, server-only), which bypasses RLS.
- Writes are gated by a shared PIN (`MATCH_PIN`, server-only secret).

## TODO

- Adopt the Supabase CLI (`supabase migration`) and an applied-migrations log so
  this ledger isn't maintained by hand.
