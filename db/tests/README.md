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
