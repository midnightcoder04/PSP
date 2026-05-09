# Phase 0 Research — RPC Tests + Security Audit

## R1 — How to invoke an RPC end-to-end against the hosted DB

**Decision**: Use `@supabase/supabase-js` clients with **real user JWTs** obtained via `signInWithPassword`. Do not use the secret-key client for role-gated RPCs.

**Rationale**: The bug class we're trying to catch (nested-aggregate, JSON-shape regressions, role-mismatch) only manifests through the **PostgREST → Postgres** path. The secret-key client connects as `service_role` which bypasses RLS *and* sets `auth.uid()` to NULL — so any function that gates on `auth.uid()` raises "Access denied" before its body is executed, hiding shape bugs.

A JWT-bearing client routes through PostgREST exactly like the browser does, so the SQL plan that fails on `aggregate function calls cannot be nested` is the plan we actually exercise.

**Alternatives considered**:
- *Direct `pg` client* (Node `pg` package + DB URL): would reach Postgres, but skips PostgREST's request envelope and the JWT-claims plumbing; that's exactly the layer where role checks happen. Rejected.
- *MCP `execute_sql`*: works for ad-hoc verification (we used it to confirm migration 009), but not callable from a vitest test — and it runs as `postgres` so role gating is moot. Rejected.
- *Set `request.jwt.claims` server-side*: Postgres-only solution; bypasses PostgREST validation. Rejected for the same reason as direct `pg`.

## R2 — How to express "would have caught the nested-aggregate bug"

**Decision**: The contract test for `get_admin_overview` MUST `await client.rpc('get_admin_overview')`, then assert `error` is null and `data` matches `{ total_sessions: number, total_participants: number, sections: array }`. The pre-009 SQL definition raises the nested-aggregate error inside Postgres → PostgREST returns 400 → supabase-js surfaces it as `{ error: { code, message }, data: null }`. The assertion `expect(error).toBeNull()` fails; the test message includes the Postgres error string.

**Rationale**: We don't need to special-case the nested-aggregate error — any Postgres-side failure inside the RPC body surfaces the same way. The assertion shape ("no error AND shape matches") is a strict superset of "no nested-aggregate".

**Alternatives considered**:
- *Capture the specific error code (42803)*: too narrow — would silently pass on a different RPC bug returning a different code. Rejected.
- *Snapshot test on the JSON*: brittle to legitimate data changes (e.g. a new section). Rejected in favour of structural assertions.

## R3 — Auth strategy for role-gated RPCs

**Decision**: `beforeAll` creates four namespaced users via `admin.auth.admin.createUser` (passwords known only to the test runner), then `signInWithPassword` produces one client per role. Tests that need a specific role assert against the matching client.

**Rationale**: Mirrors the production auth path; a role downgrade or RLS misconfiguration breaks the test the same way it would break a real user.

**Alternatives considered**:
- *Single client, swap JWTs via `setSession`*: works but obscures which role is being tested; per-role client is more readable. Accepted as readability win.
- *Reuse the production admin user `1badbdb5-…`*: violates the constraint in plan.md (no test should mutate or rely on a real user).

## R4 — Fixture lifecycle and namespacing

**Decision**: All fixture rows use the prefix `__rpc_test_` for slugs and `__rpc_test_<role>@example.invalid` for emails. `afterAll` deletes users via `admin.auth.admin.deleteUser` (which CASCADEs to `profiles` and onward to `enrollments`/`responses` via FK ON DELETE CASCADE) and the test session+enrollment via direct `from('sessions').delete()`.

**Rationale**: Re-runnability is a hard requirement (FR-003). The double cleanup (auth user delete + session delete) is needed because sessions reference profiles, but profiles cascade-delete from auth.users, and sessions need explicit removal.

**Alternatives considered**:
- *Random UUID per run*: makes failures hard to debug ("which `xyz123-...` was that?"). Rejected.
- *Transactional fixtures (BEGIN/ROLLBACK)*: not possible — `auth.admin.createUser` is an HTTP API, not a SQL statement. Rejected.

## R5 — Auto-skip when env creds absent

**Decision**: Mirror `scripts/seed.test.ts` exactly: read `VITE_SUPABASE_URL` and `SUPABASE_SECRET_KEY`, set `hasIntegrationCreds`, use `it.skip` when missing.

**Rationale**: Lets `npm test -- --run` stay green in environments without `.env.local` (e.g. fresh clones, CI without secrets). Documented in spec FR-AC-5 / NFR-002.

## R6 — Scope of "every security issue"

**Decision**: Five buckets, each producible by automated checks:

| Bucket | Source | Action |
|---|---|---|
| Supabase advisor lints | `mcp get_advisors --type security` and `--type performance` | Serialise into security-audit.md table; cross-reference against migration 010's revokes |
| RLS access matrix | Programmatic — issue 4 selects per (table × role) using per-role JWT-bearing clients | Generate markdown table with ✓/✗ |
| Edge Function authz | `client.functions.invoke('create-user', …)` as each of the 4 roles | Assert non-admin gets `admin_required` error; admin succeeds |
| Build-output sentinels | Extended `scripts/check-no-bypass.sh` | Grep `dist/` for `__dev_auth_role__`, `dev-(admin|facilitator|participant)-id`, `sb_secret_` |
| Env-var policy | grep `src/vite-env.d.ts` for forbidden `VITE_*SECRET*` declarations | Pure local check |

**Out of scope** (explicit non-goals):
- Penetration testing / fuzzing — left for an external pen-test engagement.
- Auth provider tuning beyond reporting (e.g. leaked-password-protection toggle is reported, not flipped).
- Rate-limit / DoS testing — Supabase platform concern, not feature concern.

**Rationale**: This is the *coverage frontier we can sustain in CI*. Anything beyond it is one-off pen-testing that is better procured externally.

## R7 — Hardening migration scope (010)

**Decision**: A single migration that:
1. Revokes `EXECUTE` from `anon` on user-callable RPCs (`get_admin_overview`, `get_session_stats`, `get_resume_position`) — these always require `auth.uid()` so anon calls are pure noise.
2. Revokes `EXECUTE` from `anon` AND `authenticated` on trigger-only functions (`handle_new_user`, `update_progress_on_response`) — they're invoked by triggers under `SECURITY DEFINER` and never legitimately called via REST. (`rls_auto_enable` is a Supabase platform internal, leave alone.)
3. Leaves the 5 helpers from migration 008 as-is (already locked to `authenticated` only).

**Rationale**: Resolves the named advisor warnings (`0028` for the user-callable RPCs, `0029` for the trigger-only ones) without changing the application surface. The audit script re-runs `get_advisors` after the migration to confirm zero residue.

**Alternatives considered**:
- *Convert to `SECURITY INVOKER`*: would force every RPC body to manually consult RLS — impractical for the trigger functions. Rejected.
- *Move trigger functions to a `private` schema*: cleaner but invasive (touches migration 001 and 004); deferred.

## R8 — Test naming and grouping

**Decision**: Group tests by **callee** (not by role). Each RPC gets its own `describe`, with `it` blocks for each role / scenario. Reads naturally as "what does this RPC do for whom".

**Rationale**: When a test fails, the failure surface is "which RPC broke", not "which role broke" — matches the way bugs get filed.

## R9 — Acceptance gating for the audit report

**Decision**: `npm run audit:security` exits 0 always (writes the report); a separate assertion lives in `rpc.test.ts` checking that the report's "open advisors" section is empty. That way the audit is informational, the test is authoritative.

**Rationale**: Keeps the script idempotent and re-runnable for diffing across iterations, while still failing the test suite if a new advisor warning shows up.
