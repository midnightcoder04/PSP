# Tasks: Section-Lock False Positive (Progress NULL-Unique Bug)

**Branch**: `003-slide-nav-ux-rework` | **Sub-plan**: [plan-progress-fix.md](plan-progress-fix.md)
**Scope**: DB hot-fix tracked inside Iteration 4. NOT a new feature — repairs `update_progress_on_response` trigger + `responses`/`progress` unique constraints + corrupt data.
**Parent tasks.md**: [tasks.md](tasks.md) (the slide-nav rework) — unchanged.

> **Test-first**: The Constitution §II makes test-first non-negotiable for new functional code. Both SQL test files (Phase 2) are written and verified RED before any migration apply step in Phase 3.

> **User-story framing**: This bug-fix doesn't map to spec.md user stories (those describe the slide-nav UX rework). The two "stories" below are the natural slices of the fix that can ship and be verified independently: **DB-1** repairs the schema + trigger + data; **DB-2** adds the client-side defensive dedup. **DB-1 is the MVP** — it stands alone. **DB-2** is belt-and-suspenders.

---

## Phase 1: Setup

(No project-init work — DB-only hot-fix on an existing branch.)

- [X] T001 Verify Supabase project on PG ≥ 15 (`NULLS NOT DISTINCT` support) by running `SELECT version();` via `mcp__plugin_supabase_supabase__execute_sql` on project `okedskadkspeiyxjslqc`; record result in [plan-progress-fix.md](plan-progress-fix.md) §3 if not already (currently records "17.6").

---

## Phase 2: Foundational (Blocking Prerequisites)

These are the RED tests. They MUST be written and observed FAILING against the current schema/trigger before Phase 3 implementation begins.

- [X] T002 [P] Author failing SQL test `db/tests/013_null_session_unique.sql` that: (a) inserts a response with `session_id IS NULL`, (b) attempts an upsert with the same `(participant_id, exercise_id, NULL)`, (c) asserts the table contains exactly ONE row. Must FAIL against the current migration-004 constraint.
- [X] T003 [P] Author failing SQL test `db/tests/013_progress_trigger_info_exclusion.sql` that: (a) seeds a synthetic section containing one `type='info'` exercise and one `type='checkbox'` exercise, (b) marks the checkbox response `is_complete=true`, (c) asserts the resulting `progress.section_completed_at IS NOT NULL` AND `progress.total_exercises = 1`. Must FAIL against the current trigger (which would compute `v_total=2`, leaving `section_completed_at` NULL).
- [X] T004 [P] Append entries to `db/tests/README.md` describing both new test files (purpose, how to run, expected RED → GREEN behaviour). Follows the existing `004_progress_trigger.sql` documentation pattern.
- [X] T005 Run both SQL test files against a scratch Supabase branch via `mcp__plugin_supabase_supabase__create_branch` + `mcp__plugin_supabase_supabase__execute_sql`; capture the failing output in a comment block at the top of each test file (RED proof) before proceeding to Phase 3. **(Ran against live DB inside BEGIN/ROLLBACK — no branch cost, no residue. RED proofs recorded.)**

**Checkpoint**: Both tests are RED. The trigger bug and constraint bug are mechanically reproducible. DO NOT proceed past this checkpoint without RED proofs in the test file headers.

---

## Phase 3: User Story DB-1 — Repair schema, trigger, and corrupt data (P1) 🎯 MVP

**Story goal**: After this phase, no participant has a `progress.section_completed_at` set unless their non-info responses for that section are genuinely all `is_complete=true`. New saves with `session_id IS NULL` update existing rows instead of inserting duplicates. Tests T002 and T003 are GREEN.

**Independent test criteria**:
1. `SELECT COUNT(*) - COUNT(DISTINCT (participant_id, exercise_id, session_id)) FROM public.responses;` returns **0**.
2. `SELECT COUNT(*) - COUNT(DISTINCT (participant_id, section_id, session_id)) FROM public.progress;` returns **0**.
3. T002 and T003 both pass against the migrated schema.
4. For participant `706a8245-e36b-4556-a272-7b09ede37e25`, `progress` row for `values` slug shows `section_completed_at IS NULL` (Values is not legitimately complete).
5. CourseHome in the running app shows Roles as **locked** for the affected participant.

### Implementation

- [X] T006 [US1] Author migration `db/migrations/013_fix_progress_nulls.sql` per [plan-progress-fix.md §6.3](plan-progress-fix.md). Single `BEGIN…COMMIT` transaction containing: (a) dedup `responses` via `DELETE … USING` with `IS NOT DISTINCT FROM` and `(updated_at, id) <` tie-break, (b) dedup `progress` similarly on `(last_activity_at, id)`, (c) drop old unique constraints, (d) `CREATE UNIQUE INDEX … NULLS NOT DISTINCT` on both tables, (e) `CREATE OR REPLACE FUNCTION public.update_progress_on_response()` with `e.type <> 'info'` filters on both `v_total` and `v_completed` and `r.session_id IS NOT DISTINCT FROM NEW.session_id`, (f) backfill UPDATE that recomputes `completed_exercises`, `total_exercises`, `section_completed_at` for every surviving `progress` row.
- [X] T007 [US1] Author down-migration `db/migrations/013_fix_progress_nulls_down.sql` that restores the pre-013 trigger body and the legacy unique constraints (without re-introducing duplicate rows). Document in a top-of-file comment that the dedup is NOT reversed.
- [X] T008 [P] [US1] Mirror the migration to `supabase/migrations/20260515000002_013_fix_progress_nulls.sql` (replace `MMDDhhmmss` with the actual UTC timestamp at apply time). Use the same content as T006. This is required for parity per Iteration 1 conventions (see `supabase/migrations/` history).
- [X] T009 [US1] Run T002 and T003 against the **migrated** schema (on the same scratch branch from T005 plus the new migration). Confirm both are GREEN. Replace the RED proof comments at the top of each test file with GREEN proofs (timestamp + row counts). **(Both GREEN via in-transaction simulation.)**
- [X] T010 [US1] Pre-flight diff script: run `SELECT p.participant_id, s.slug, p.section_completed_at AS before_at, (SELECT … recompute …) AS after_at FROM public.progress p JOIN public.sections s ON s.id = p.section_id` against production data BEFORE applying T006 to live. Save output to `specs/003-slide-nav-ux-rework/progress-fix-preflight.md` for user review. Any row where `before_at IS NOT NULL AND after_at IS NULL` is a section the migration will re-lock — surface these explicitly so the user can confirm before commit.
- [X] T011 [US1] **GATE — user approval required.** Present the pre-flight diff (T010) to the user. Wait for explicit "apply" instruction before T012. Do not proceed otherwise. **(User approved "Apply now" via AskUserQuestion 2026-05-15.)**
- [X] T012 [US1] Apply T006 to the live Supabase project via `mcp__plugin_supabase_supabase__apply_migration` with `name='013_fix_progress_nulls'` and the SQL body from T006. Confirm success. **(success: true.)**
- [X] T013 [US1] Post-apply verification: re-run the diagnostic queries from the bug discovery (`SELECT 'responses', COUNT(*), COUNT(DISTINCT …) … UNION ALL SELECT 'progress' …`) on the live DB. Assert distinct == total for both tables under `session_id IS NULL`. Also query `progress WHERE participant_id = '706a8245-…' AND section_id = (Values)` and confirm `section_completed_at IS NULL`. **(responses 13/13, progress 5/5, Values section_completed_at = NULL.)**
- [ ] T014 [US1] Manual UI verification: in the running app, log in as the affected participant, visit `/course`, confirm: (a) the Roles card renders with the lock icon and "Locked — complete Values first" hint, (b) the Continue CTA points at `values` (the next un-locked-and-incomplete section). **(Awaiting browser test by user.)**

**Checkpoint**: DB-1 is shippable. The bug is repaired. DB-2 is optional hardening from here.

---

## Phase 4: User Story DB-2 — Client defensive dedup (P2)

**Story goal**: `useProgress` returns at most one row per `section_id` even if the DB ever drifts back into a duplicate state (e.g. teammate's local DB without the migration, future regression). This is belt-and-suspenders; the migration in Phase 3 prevents new duplicates entirely.

**Independent test criteria**:
1. New `useProgress.test.ts` case: given a fixture of two `Progress` rows with the same `section_id` and different `last_activity_at`, the hook returns only the newer one.
2. Existing `useProgress.test.ts` tests still pass.
3. `npx tsc --noEmit` clean.
4. `npx vitest run src/hooks/useProgress.test.ts` GREEN.

### Implementation

- [X] T015 [P] [US2] Add failing test case to `src/hooks/useProgress.test.ts`: `it('deduplicates progress rows by section_id, keeping the most recent', …)`. Mock the supabase fetch to return two rows with the same `participant_id` + `section_id`, different `last_activity_at`. Assert the hook's `progress` array has length 1 and the surviving row is the newer one.
- [X] T016 [US2] Implement the dedup pass in `src/hooks/useProgress.ts` per [plan-progress-fix.md §6.5](plan-progress-fix.md): build a `Map<sectionId, Progress>` in the `fetch` callback before `setProgress`, keep the row with the greater `last_activity_at`. Should be ~10 lines.
- [X] T017 [US2] Run `npx vitest run src/hooks/useProgress.test.ts` — confirm GREEN. Run `npx tsc --noEmit` — confirm clean. Run full suite `npx vitest run` — confirm no other tests regressed. **(182 tests pass, 0 fail; tsc clean.)**

**Checkpoint**: DB-2 ships. Future drift is contained client-side.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T018 [P] Update parent `tasks.md` Iteration 4 task list to add a one-line cross-reference under "Bugs surfaced during testing": `- See [tasks-progress-fix.md](tasks-progress-fix.md) for the section-lock NULL-unique fix tracked as a sub-effort of WS-1.`
- [ ] T019 [P] Update [plan.md](plan.md) Iteration 4 Complexity Tracking with a `Bug` row noting the migration-004 NULL-unique footgun discovered during T029-style manual QA; link to `plan-progress-fix.md` for resolution.
- [ ] T020 Commit all changes from T002–T017 in a single commit: `fix(db): repair progress trigger + NULL-unique constraints [003]`. Body must list both root causes (RC-1, RC-2) and reference `plan-progress-fix.md`. Co-authored attribution as project convention.
- [ ] T021 Optional: open a follow-up issue/note for Iteration 5 to add a CI step that runs `db/tests/*.sql` on a Supabase branch before merge (currently `db/tests/` has files but no CI hook). Not required to ship this fix.

---

## Dependency Graph

```text
T001 (env check) ────────────────────────────────────┐
                                                     │
T002 ── T003 ── T004 ─── T005 (RED proofs) ──────────┤
                                                     ▼
                                                   T006 ── T007 ── T008
                                                                    │
                                                                  T009 (GREEN proofs)
                                                                    │
                                                                  T010 (preflight diff)
                                                                    │
                                                                  T011 (USER GATE)
                                                                    │
                                                                  T012 (apply live)
                                                                    │
                                                                  T013 ── T014  ✅ DB-1 done
                                                                              │
                                                                              ▼
                                                                  T015 ── T016 ── T017  ✅ DB-2 done
                                                                                            │
                                                                                            ▼
                                                                  T018 ── T019 ── T020 ── T021
```

- US2 (T015–T017) does NOT block on US1 being applied to prod (only on T006 existing as source-of-truth for the dedup semantics).
- T018, T019 are doc-only and parallel with each other and T020.

---

## Parallel Execution Opportunities

- **Phase 2 fan-out**: T002, T003, T004 are independent files → all `[P]`.
- **Phase 3 fan-out**: T008 (supabase mirror) `[P]` with T006/T007 only after T006's SQL body is finalized.
- **Phase 4 fan-out**: T015 (test) before T016 (impl), but T015 itself is `[P]` with any unfinished Phase 3 doc tasks.
- **Phase 5 fan-out**: T018, T019 fully `[P]` with each other and with T020 if grouped into one final commit.

Example parallel batch for an LLM agent on a fresh checkout:

```text
Parallel batch A (Phase 2): T002, T003, T004
Sequential gate:            T005 (proves RED)
Parallel batch B (Phase 3): T006, T007 (must be sequential to T006), T008 (parallel with T007)
Sequential gate:            T009 (proves GREEN), T010, T011 (user), T012, T013, T014
Parallel batch C (Phase 4): T015 → T016 → T017
Parallel batch D (Phase 5): T018, T019 (both [P]); T020 (commit); T021 (optional)
```

---

## Independent Test Criteria Summary

| Story | Independently testable? | How |
|-------|--------------------------|-----|
| DB-1  | YES | T013 + T014 (DB diagnostic queries + UI manual check on `/course`) |
| DB-2  | YES | T017 (`npx vitest run src/hooks/useProgress.test.ts`) |

---

## MVP Scope

**MVP = DB-1 (Phase 3 only)**. Shipping DB-1 alone fixes the participant-facing bug. DB-2 is post-MVP hardening.

If time is constrained, ship Phase 1 → Phase 2 → Phase 3 → T020 (commit). Defer Phase 4 (DB-2) and Phase 5 doc updates to a follow-up commit.

---

## Format Validation

All 21 tasks follow the strict format: `- [ ] T### [P?] [Story?] description with file path`. Setup (T001), Foundational (T002–T005), and Polish (T018–T021) tasks correctly omit the `[Story]` label. Story phases (T006–T017) all carry `[US1]` or `[US2]`. File paths are absolute references rooted at the repo (e.g. `db/migrations/013_fix_progress_nulls.sql`, `src/hooks/useProgress.ts`).
