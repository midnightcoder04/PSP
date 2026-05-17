# db/tests

Hand-rolled SQL tests for migrations and triggers. Each `*.sql` file wraps its
fixtures in `BEGIN`/`ROLLBACK` so it can be re-run without leaving residue.

## Running locally (via psql)

```bash
psql "$SUPABASE_DB_URL" -f db/tests/004_progress_trigger.sql
```

`SUPABASE_DB_URL` is the direct Postgres connection string (Supabase Dashboard →
Project Settings → Database → Connection string → URI). The user must have
permission to insert into `auth.users` — typically `postgres` or the service
role connection.

A passing run produces no output. A failure raises a `RAISE EXCEPTION` with the
mismatched value.

## Running via the Supabase MCP

Paste the file contents into `mcp__plugin_supabase_supabase__execute_sql`. The
final `ROLLBACK` ensures no fixture rows persist even if the call succeeds.

## Files

| File | Tests |
|---|---|
| `004_progress_trigger.sql` | `update_progress_on_response` trigger (migration 004) — verifies count increments on `is_complete=true` and decrements on `is_complete=false`. |
| `013_null_session_unique.sql` | Uniqueness of `(participant_id, exercise_id, session_id)` and `(participant_id, section_id, session_id)` when `session_id IS NULL` (migration 013) — verifies two upserts with the same NULL-session key yield exactly one row in `responses` and one in `progress`. Fails against migration 004's default NULL-distinct constraint; passes against migration 013's `NULLS NOT DISTINCT` index. |
| `013_progress_trigger_info_exclusion.sql` | Info-exercise exclusion in `update_progress_on_response` (migration 013) — verifies that a section with one `type='info'` exercise and one `type='checkbox'` exercise auto-completes when the checkbox response is `is_complete=true`, and that `progress.total_exercises = 1`. Fails against the migration-004 trigger (which counts info exercises); passes against the migration-013 trigger. |
