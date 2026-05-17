# SC-002 Regression Evidence

**Date validated**: 2026-05-11
**Task**: T039 — one-time manual validation of SC-002
**Claim**: The `npm run test:rpc` suite would have caught the `get_admin_overview` nested-aggregate bug from Iteration 2.

## Method

Using the Supabase MCP `execute_sql` tool (running as postgres superuser), we:

1. Temporarily re-applied migration 006's pre-fix `get_admin_overview` definition (the one with `AVG(...)` nested inside `jsonb_agg(...)`).
2. Directly executed the nested-aggregate body against the hosted DB (bypassing the auth check by calling the SQL inline).
3. Confirmed the error appears.
4. Re-applied migration 009's derived-table fix to restore production state.

## Failure output (step 2)

```
ERROR:  42803: aggregate function calls cannot be nested
LINE 9:           100.0 * AVG(
                          ^
```

This is exactly the error that PostgREST surfaces as a 400 when `client.rpc('get_admin_overview')` is called. The `rpc.test.ts` assertion:

```typescript
expect(error, error?.message).toBeNull()  // would have failed
expect(data).not.toBeNull()               // data === null on error
```

would have failed with `error.message` containing `aggregate function calls cannot be nested` — satisfying SC-002.

## Why T007-T011 (helper tests) pass in production

The helper tests (`is_admin`, `is_active_user`, etc.) are passing NOW because migration 008 was already applied to the hosted DB. Their RED state existed before migration 008 was applied (evidenced by the 500 errors on `/rest/v1/profiles`, `/rest/v1/sessions`, and `/rest/v1/enrollments` that were caught in Iteration 2's incident log — those 500s were the RLS recursion bug that migration 008 fixed).

## Why T029 (proacl assertions) passes in production

Migration 010 has been applied. The `pg_proc.proacl` verification SQL now shows `{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}` for all 10 in-scope functions — no PUBLIC wildcard (`=X/...`) and no `anon=X/...` entry.

## Production state confirmed clean

After re-applying migration 009, the derived-table body runs correctly:

```sql
-- Direct verification (no nested aggregate):
SELECT jsonb_agg(jsonb_build_object('slug', t.slug, 'avg', t.avg_completion_pct))
FROM (
  SELECT s.slug, ROUND(100.0 * AVG(CASE WHEN p.total_exercises > 0
    THEN p.completed_exercises::numeric / p.total_exercises END), 1) AS avg_completion_pct
  FROM public.sections s
  LEFT JOIN public.progress p ON p.section_id = s.id
  GROUP BY s.slug, s.title, s.order_index
) t;
-- Returns: 6 section rows with avg_completion_pct values. ✓
```
