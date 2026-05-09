---
description: "Hosted-DB RPC contract tests + comprehensive security audit"
---

# Feature Specification: RPC Contract Tests & Security Audit (Iteration 3)

**Branch**: `002-iter2-fixes`
**Date**: 2026-05-10
**Driving incidents**:
- The `aggregate function calls cannot be nested` defect in `get_admin_overview` shipped to the hosted DB and was caught only by a manual UI smoke test (PostgREST returned 400). Vitest mocks did not catch it because no test invokes the function against real Postgres.
- A static security review has not been run end-to-end against the hosted project; only ad-hoc fixes (T132 dev-bypass sentinel; T062 service-role audit; migration 008 RLS recursion fix) have landed.

## User Scenarios & Testing

### Primary flow

A maintainer runs `npm run test:rpc` against the hosted Supabase project and sees one assertion per RPC pass — covering JSON shape, role-based authorization, and query correctness. The same suite would have failed loudly on the nested-aggregate bug in 009.

A maintainer runs `npm run audit:security` and gets a single report listing every advisor finding (security + performance), every RLS-policy gap from a derived role × table matrix, every secret-exposure risk from a build-output grep, and every Edge-Function authorization gap.

### Acceptance criteria

- **AC-1 (RPC contract coverage)**: Every public RPC in `db/migrations/*.sql` plus every helper from migration 008 has at least one positive contract test that calls it via `supabase-js` against the hosted project and asserts (a) no PostgREST error, (b) a JSON shape matching `contracts/rpcs.md`.
- **AC-2 (Aggregate-nesting class caught)**: The contract test for `get_admin_overview` would have failed against migration 006's pre-fix definition with a recognisable error — i.e. it does not pre-shape the call to dodge the nested-aggregate path.
- **AC-3 (Role authorization caught)**: Each RPC that gates on role (`get_admin_overview` requires admin; `get_session_stats` requires facilitator-of-session OR admin; `get_resume_position` requires `p_participant_id == auth.uid()`) has a test that asserts an unauthorized caller receives a Postgres exception (PostgREST 400).
- **AC-4 (Idempotent fixtures)**: The RPC test suite creates its own users via `auth.admin.createUser`, sessions, enrollments, and responses in `beforeAll` with a `__rpc_test_*` namespace; `afterAll` removes every fixture so re-runs are stable.
- **AC-5 (Auto-skip without creds)**: When `VITE_SUPABASE_URL` or `SUPABASE_SECRET_KEY` is not set, the suite skips cleanly (no failures), matching the existing `scripts/seed.test.ts` pattern.
- **AC-6 (Security audit completeness)**: `npm run audit:security` produces `specs/002-iter2-fixes/security-audit.md` with these sections, each populated:
  1. Supabase advisor findings (security + performance) by ID, severity, and remediation status (open / fixed-in-this-iteration / accepted with note).
  2. RLS access matrix: every (table × role × operation) cell either ✓ allowed by a named policy or ✗ blocked, with a test that proves it for at least one fixture row.
  3. Edge Function authorization: `create-user` admin-check verified by an integration test that calls it as participant + facilitator + admin + unauthenticated.
  4. Build-output sentinel scan (existing `scripts/check-no-bypass.sh` extended): assert no `sb_secret_…` and no `dev-(admin|facilitator|participant)-id` strings appear in `dist/`.
  5. Env-var policy: assert `vite-env.d.ts` has no `VITE_SUPABASE_SECRET_KEY` or `VITE_SUPABASE_SERVICE_ROLE_KEY` declarations.
- **AC-7 (Hardening migration)**: A migration revokes `EXECUTE` on user-callable RPCs from `anon` (so the advisor `0028` warnings disappear) and on trigger-only functions from both `anon` and `authenticated` (so `0029` disappears for those rows). The migration MUST keep the surface that the application actually uses.

### Out of scope

- Performance benchmarks (T125 is its own task; this spec only covers correctness).
- Penetration testing (browser fuzzing, OWASP top 10 active probes).
- Auth provider hardening beyond the leaked-password-protection toggle (the spec records the recommendation but does not enforce the change here).

## Requirements

### Functional Requirements

- **FR-001 (test runtime)**: The RPC suite MUST run inside `vitest` so it shares the existing `npm test -- --run` invocation but in a separate file (`scripts/rpc.test.ts`) marked `@vitest-environment node`.
- **FR-002 (auth strategy)**: The suite MUST exercise role-gated RPCs by signing the test users in via `signInWithPassword` and calling `client.rpc(...)` with the resulting JWT — not by manipulating `request.jwt.claims` server-side.
- **FR-003 (fixture isolation)**: Test users, sessions, enrollments, responses MUST be namespaced with `__rpc_test_` prefixes (slug / email) and MUST be deleted by `afterAll`, even on test failure (`afterAll` guarded by try/catch).
- **FR-004 (advisor scrape)**: The audit script MUST call the Supabase MCP `get_advisors` tool (security and performance) and serialise findings into `security-audit.md`.
- **FR-005 (RLS matrix generator)**: The audit script MUST programmatically enumerate (table, role, operation) tuples and exercise each via the role-specific JWT, producing a markdown table with the result.
- **FR-006 (deterministic ordering)**: Tests MUST not depend on row creation order (sort fixtures by deterministic key when comparing).

### Non-Functional Requirements

- **NFR-001 (no regressions)**: Existing 102 passing / 3 skipped tests continue to pass and skip respectively after the additions.
- **NFR-002 (CI-able)**: The suite MUST exit with a non-zero status when any RPC contract fails. (Skipping when no creds is exit 0, matching seed.test.ts.)
- **NFR-003 (hosted-only)**: The suite MUST NOT require Docker or local Supabase. It targets the hosted project only.

## Success Criteria

- **SC-001**: The full RPC suite runs end-to-end in ≤ 30 seconds against the hosted project (network-bound).
- **SC-002**: When migration 006's pre-fix definition is reapplied (in a throwaway branch), `npm run test:rpc` reports `get_admin_overview` failed with the substring `aggregate function calls cannot be nested`.
- **SC-003**: After the hardening migration, `get_advisors --type security` returns zero `0028` and zero `0029` findings for `public.*` functions that were marked for restriction.
- **SC-004**: The audit report's RLS matrix shows every cell marked either ✓ (proven by a test) or ✗ (proven by a denied call) — no "unknown".
- **SC-005**: The signal:noise ratio of the audit report is high enough that a maintainer can act on it in one sitting (≤ 30 minutes from open-to-decisions).
