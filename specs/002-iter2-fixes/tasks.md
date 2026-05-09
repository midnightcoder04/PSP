---
description: "Task list for RPC Contract Tests & Security Audit (Iteration 3)"
---

# Tasks: RPC Contract Tests & Security Audit (Iteration 3)

**Input**: Design documents from `/specs/002-iter2-fixes/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: This iteration *is* tests. Constitution §II (Test-First) is satisfied because each story's
test/audit assertions land before its remediation (e.g. the hardening migration 010 is gated on the
audit script reporting the warning first). Test tasks are marked with `[RED]` where they MUST fail
before the implementation that makes them pass.

**Organization**: Three user stories, each independently testable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Different files, no dependency on incomplete tasks — safe to run in parallel
- **[Story]**: Maps to user-story phase (US1 / US2 / US3)
- File paths are absolute or repo-relative

---

## Phase 1: Setup

**Purpose**: Add the npm scripts and one new env var; no source code yet.

- [ ] T001 Add `RPC_TEST_PASSWORD` placeholder to `.env.example` with a comment that it is reused across the four `__rpc_test_*` users and never touches production
- [ ] T002 Add `"test:rpc": "vitest run scripts/rpc.test.ts --env-file=.env.local"` and `"audit:security": "tsx --env-file=.env.local scripts/audit-security.ts"` to `package.json` `scripts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared fixture helpers used by both the RPC suite and the audit script.

**⚠️ CRITICAL**: No user-story work starts until Phase 2 is complete.

- [ ] T003 Create `scripts/_rpc_fixtures.ts` exporting `setupFixtures(): Promise<Fixtures>` and `teardownFixtures(f: Fixtures): Promise<void>` per `data-model.md` (creates the four `__rpc_test_*` users via `admin.auth.admin.createUser`, sets roles + `is_active`, inserts the test session/enrollment/two responses, and signs each user in to return one client per role)
- [ ] T004 [P] Create `scripts/_rpc_fixtures.types.ts` exporting the `Fixtures`, `RoleClient`, and `TestUser` interfaces consumed by both the RPC test suite and the audit script
- [ ] T005 Add a best-effort pre-cleanup in `setupFixtures()` that lists `__rpc_test_*@example.invalid` users and `from('sessions').select` titled `__rpc_test_session`, deleting any leftovers before creating fresh ones (per `quickstart.md` failure-mode "Email already in use")

**Checkpoint**: Foundation complete — fixture helpers can be imported and the four-user/one-session sandbox spins up cleanly. US1, US2, US3 may now begin.

---

## Phase 3: User Story 1 — RPC Contract Suite (Priority: P1) 🎯 MVP

**Goal**: A hosted-DB integration test per RPC and per migration-008 helper that would have caught the nested-aggregate regression in `get_admin_overview` and that pins every helper's boolean truth-table from `contracts/helpers.md`.

**Independent Test**: `npm run test:rpc` against the hosted project exits 0 with all RPC contract tests green; re-applying migration 006's pre-fix definition flips `get_admin_overview` red with `aggregate function calls cannot be nested`.

### Tests for US1 — Write First, Confirm RED ⚠️

- [ ] T006 [US1] Create `scripts/rpc.test.ts` with `// @vitest-environment node`, the env-detection skip-guard mirroring `scripts/seed.test.ts`, and a single `describe('rpc.test.ts smoke', () => it('mounts', () => expect(true).toBe(true)))` so vitest discovers the file before any contract test lands **[RED scaffold — passes immediately, but exists so subsequent RED tests can be added without file-creation churn]**
- [ ] T007 [P] [US1] Add `describe('helpers/is_admin', …)` in `scripts/rpc.test.ts` per `contracts/helpers.md` `is_admin` table — five `it` blocks (admin/admin = true, admin/facilitator = false, admin/inactive = false, facilitator/admin = true, anon/admin = error). Use the per-role clients from `setupFixtures` **[RED — passes once T020 helper-grant migration is in place]**
- [ ] T008 [P] [US1] Add `describe('helpers/is_active_user', …)` per `contracts/helpers.md` table **[RED]**
- [ ] T009 [P] [US1] Add `describe('helpers/facilitates_session', …)` per `contracts/helpers.md` table **[RED]**
- [ ] T010 [P] [US1] Add `describe('helpers/participant_in_session', …)` per `contracts/helpers.md` table **[RED]**
- [ ] T011 [P] [US1] Add `describe('helpers/facilitator_has_participant', …)` per `contracts/helpers.md` table **[RED]**
- [ ] T012 [P] [US1] Add `describe('rpc/get_admin_overview', …)` in `scripts/rpc.test.ts` per `contracts/rpcs.md` test matrix; the admin assertion MUST destructure `data.sections` as an array of length 6 with `slug, title, avg_completion_pct` keys (this is the regression guard for the nested-aggregate class — SC-002) **[RED — passes only against migration 009]**
- [ ] T013 [P] [US1] Add `describe('rpc/get_session_stats', …)` per `contracts/rpcs.md` test matrix (facilitator owner = ok shape, admin = ok, participant = Access denied, foreign facilitator = Access denied) **[RED]**
- [ ] T014 [P] [US1] Add `describe('rpc/get_resume_position', …)` per `contracts/rpcs.md` test matrix (participant own/own session = row-or-empty, participant calling with another user's id = Access denied, facilitator calling with participant id = Access denied) **[RED]**

### Implementation for US1

- [ ] T015 [US1] Verify all RED tests T007–T014 actually fail on a fresh checkout. Document the failure-output snippet in commit message (Constitution §II)
- [ ] T016 [US1] Wire `beforeAll(setupFixtures)` and `afterAll(teardownFixtures)` in `scripts/rpc.test.ts`; cache the four role clients in module scope. Tests T007–T014 should now flip Green for the helpers + RPCs that already work (everything except items gated on T020)
- [ ] T017 [US1] Add the **regression-class assertion** to `describe('rpc/get_admin_overview', …)`: a separate `it('would catch the nested-aggregate regression class', …)` that asserts `error === null AND data !== null AND data.total_sessions !== undefined`. Comment cites SC-002 + migration 009
- [ ] T018 [US1] Run `npm run test:rpc` end-to-end; record wall-clock in the commit message; confirm ≤ 30 s (SC-001)

**Checkpoint**: US1 complete. Hosted-DB RPC contract suite live; nested-aggregate class permanently guarded.

---

## Phase 4: User Story 2 — Security Audit Script + Report (Priority: P2)

**Goal**: A single command writes `specs/002-iter2-fixes/security-audit.md` covering all five buckets from `spec.md` AC-6, and the RPC test suite gains an `audit_assertions` `describe` block that fails on any "open" finding from the report.

**Independent Test**: `npm run audit:security` exits 0 and writes a non-empty report; `npm run test:rpc` then fails if and only if the report's "Open advisors" or "RLS matrix mismatches" sections are non-empty.

### Tests for US2 — Write First, Confirm RED ⚠️

- [ ] T019 [US2] Add `describe('audit_assertions', …)` to `scripts/rpc.test.ts` with four `it.skip(…)` placeholder tests (open-advisors-empty, rls-matrix-clean, edge-fn-authz-passes, sentinel-scan-clean) so the structure exists but stays skipped until US2 implementation lands **[RED scaffold]**

### Implementation for US2

- [ ] T020 [US2] Create `scripts/audit-security.ts` skeleton: imports `setupFixtures`/`teardownFixtures`, opens `specs/002-iter2-fixes/security-audit.md` for writing, writes section headings (`## Supabase advisors`, `## RLS access matrix`, `## Edge Function authz`, `## Build sentinel scan`, `## Env-var policy`), and an empty body under each (so the file shape is reviewable before content lands)
- [ ] T021 [P] [US2] Implement Section 1 of `audit-security.ts`: call Supabase REST `GET /v1/projects/{ref}/advisors?type=security` (and `?type=performance`) using `SUPABASE_SECRET_KEY`. Render each finding as a row in a markdown table (id, level, title, target, remediation URL, status). Status is computed: `resolved-by-010` when the finding's id matches the planned remediation set, else `open`
- [ ] T022 [P] [US2] Implement Section 2 of `audit-security.ts`: enumerate `(table, role, op)` per `contracts/helpers.md` "RLS Access Matrix"; for each cell, issue the operation against the per-role client from `setupFixtures`; record ✓ when result matches expectation, ✗ + observed-vs-expected when it doesn't
- [ ] T023 [P] [US2] Implement Section 3 of `audit-security.ts`: for each of the four roles plus an unauthenticated client, call `client.functions.invoke('create-user', { body: <fixture> })` and record the response per `contracts/rpcs.md` "Edge Function Contract" table. **Make sure to clean up the user the admin row creates** (admin.auth.admin.deleteUser in finally)
- [ ] T024 [P] [US2] Implement Section 4 of `audit-security.ts`: spawn `scripts/check-no-bypass.sh` (after T028 extends it) and embed its stdout/exit code into the report
- [ ] T025 [P] [US2] Implement Section 5 of `audit-security.ts`: read `src/vite-env.d.ts` and grep for `VITE_.*SECRET` / `VITE_.*SERVICE_ROLE`. Embed the matches (should be zero)
- [ ] T026 [US2] Flip `it.skip(…)` to `it(…)` in the `audit_assertions` describe block (T019). Each test reads the freshly-written `specs/002-iter2-fixes/security-audit.md` and parses the relevant section, asserting it contains zero "open" / "✗" / non-zero-exit / forbidden-grep-hit
- [ ] T027 [US2] Add a `beforeAll` to the `audit_assertions` describe that shells out to `npm run audit:security` (so the report is always fresh before the assertions run). Document in `quickstart.md` that this adds ~10 s to the suite when the audit script needs to network-call Supabase

### Hardening of `check-no-bypass.sh` (US2-adjacent)

- [ ] T028 [US2] Extend `scripts/check-no-bypass.sh` to also fail on `dist/` content matching: `dev-(admin|facilitator|participant)-id` and any `sb_secret_` token (case-sensitive). Update the script's leading comment block to enumerate all sentinels

**Checkpoint**: US2 complete. Security posture has a single-command scan with a CI-fail gate riding on top.

---

## Phase 5: User Story 3 — Advisor Hardening Migration (Priority: P3)

**Goal**: Migration 010 revokes `EXECUTE` per the advisor recommendations so future `audit:security` runs report zero "open" advisors of class `0028`/`0029` for the named functions, while leaving the application surface untouched.

**Independent Test**: After applying migration 010 and re-running `audit:security`, Section 1 of `security-audit.md` shows status `resolved-by-010` for every previously-open `0028`/`0029` finding on the in-scope functions, and no Section-2 RLS cell flips from ✓ to ✗.

### Tests for US3 — Write First, Confirm RED ⚠️

- [ ] T029 [US3] Add `describe('migration_010_post_apply', …)` to `scripts/rpc.test.ts` with two assertions: (1) `pg_proc.proacl` for each in-scope function does NOT include `anon=X` (and for trigger-only functions, does not include `authenticated=X` either); (2) US1's existing helper + RPC tests still pass (re-asserting via re-running a sample of them) **[RED — passes once migration 010 lands]**

### Implementation for US3

- [ ] T030 [US3] Create `db/migrations/010_lock_security_definer_grants.sql` per `research.md` R7. Body: `REVOKE EXECUTE ON FUNCTION public.get_admin_overview() FROM anon;` and same for `get_session_stats(uuid)`, `get_resume_position(uuid, uuid)`, then `REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;` (trigger-only) and same for `update_progress_on_response()`. Add a header comment listing the advisor IDs being addressed (`0028`, `0029`) and explicitly leaving `rls_auto_enable` alone (Supabase platform internal)
- [ ] T031 [US3] Mirror the migration to `supabase/migrations/<timestamp>_010_lock_security_definer_grants.sql` per the T105 pattern from Iteration 2 (so contributors using the Supabase CLI's `db push` see it too)
- [ ] T032 [US3] Apply migration 010 to the hosted project via Supabase MCP `apply_migration`. Capture the success response in commit message
- [ ] T033 [US3] Re-run `npm run audit:security`; verify Section 1 now shows `resolved-by-010` for every in-scope finding; commit the regenerated `security-audit.md`
- [ ] T034 [US3] Re-run `npm run test:rpc`; confirm `migration_010_post_apply` (T029) flips Green and no US1 test regresses

**Checkpoint**: US3 complete. Advisor warnings closed for the in-scope set; Supabase Studio's `get_advisors` shows the residual findings only for `rls_auto_enable` (platform internal, accepted).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T035 [P] Update `specs/002-iter2-fixes/quickstart.md` with the actual measured wall-clock from T018 (replace "≤ 30 s" with the observed value) and the actual lines-of-output from T033 if material
- [ ] T036 [P] Update `specs/001-psp-course-platform/tasks.md` to flip T124 (RLS integration tests) and T125 (RPC bench) to a `superseded by 002-iter2-fixes` note pointing here. (T125 RPC bench remains separately useful but is not blocked.)
- [ ] T037 Add an Iteration 3 line to `specs/001-psp-course-platform/bundle-report.md` confirming "no bundle change — no client code touched" so the bundle history stays continuous
- [ ] T038 Run the full `npm test -- --run` and confirm the count is at least `previous (102) + new RPC tests + audit_assertions + migration_010_post_apply`. Record the new total in commit message

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001/T002 — independent of each other, no dependencies. Begin immediately.
- **Foundational (Phase 2)**: T003 → T005 (T005 mutates the same file as T003). T004 [P] alongside T003.
- **US1 (Phase 3)**: Depends on Phase 2 (needs `setupFixtures`). MVP — can ship before US2/US3.
- **US2 (Phase 4)**: Depends on Phase 2 + US1's `audit_assertions` scaffold (T019 requires the `scripts/rpc.test.ts` file from T006). Can run mostly in parallel with US3 once T020 lands.
- **US3 (Phase 5)**: Depends on Phase 2; partially overlaps US2 (US2's Section 1 of the audit script informs which functions T030 should target — but T030's target list is already specified in research.md R7, so US3 can technically start earlier).
- **Polish (Phase 6)**: After US1, US2, US3 all complete.

### Within Each User Story

- US1: T006 (scaffold) → T007–T014 RED tests in parallel → T015 verify RED → T016 fixtures wire-in → T017 SC-002 guard → T018 timing measurement
- US2: T019 (skip scaffold) → T020 (script skeleton) → T021–T025 in parallel → T026/T027 flip skips → T028 sentinel extension
- US3: T029 RED → T030 → T031 [P with T030] → T032 apply → T033/T034 re-verify

### Parallel Opportunities (within US1 RED tests)

```bash
# After T006 scaffold lands, all RED test additions are different describe blocks in the same file
# but can be authored in parallel (merge sequentially, but no logical conflict):
T007 (helpers/is_admin)
T008 (helpers/is_active_user)
T009 (helpers/facilitates_session)
T010 (helpers/participant_in_session)
T011 (helpers/facilitator_has_participant)
T012 (rpc/get_admin_overview)         # SC-002 regression guard
T013 (rpc/get_session_stats)
T014 (rpc/get_resume_position)
```

### Parallel Opportunities (within US2 audit sections)

```bash
# After T020 script skeleton, each section is an independent function in audit-security.ts:
T021 (Section 1: advisors)
T022 (Section 2: RLS matrix)
T023 (Section 3: edge fn authz)
T024 (Section 4: build sentinel)
T025 (Section 5: env policy)
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 Setup (T001–T002)
2. Phase 2 Foundational (T003–T005)
3. Phase 3 US1 (T006–T018)
4. **STOP and VALIDATE**: `npm run test:rpc` green; resimulate migration 006's nested-aggregate definition and confirm `get_admin_overview` test fails the way SC-002 expects; revert
5. MVP shipped — the regression guard is in place

### Incremental Delivery

1. Setup + Foundational → npm scripts + fixture helpers
2. US1 → RPC contract suite, nested-aggregate guard live
3. US2 → security-audit.md generator + CI-fail gate
4. US3 → migration 010, advisor warnings closed
5. Polish → docs sync, full-suite count check

### Single-Developer Strategy

- Land US1 in one PR (T001–T018). Demo: `npm run test:rpc` against hosted project.
- Land US2 in a second PR (T019–T028). Demo: `security-audit.md` artifact + `audit_assertions` failing on a deliberately-introduced advisor warning.
- Land US3 in a third PR (T029–T034). Demo: `audit_assertions` flips back to green; advisor warnings closed.
- Polish (T035–T038) folded into the US3 PR or a small follow-up.

---

## Notes

- All `[P]` tasks within a phase write to different files OR independent regions of the same file (US1 RED tests are sibling `describe` blocks — author in parallel, merge serially).
- `[US*]` labels enable independent shipping; US1 alone closes the headline gap (the nested-aggregate class).
- `[RED]` test tasks MUST fail before their paired implementation begins (Constitution §II). Verify and document in commit messages.
- The auth-provider toggle (`auth_leaked_password_protection`) is reported by the audit but NOT enforced here. Tracked as an out-of-scope recommendation in spec.md.
- Migration 010 is intentionally narrow. Functions outside the named set (e.g. `rls_auto_enable`) are left alone.
