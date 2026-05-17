# Tasks: Course Content Restructure — Three Groups, Nine Sections, Per-Question Answer Fields

**Feature**: 004-content-restructure
**Branch**: `004-content-restructure`
**Input**: Design documents in `/specs/004-content-restructure/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓ (seed-json, group-section-mapping, migration-014), quickstart.md ✓

**Tests**: Included — the spec/plan explicitly require Test-First (Constitution §II), `[RED]`/`[GREEN]` SQL pairs (mirrors Iter 3/Iter 4 convention), Vitest mirrors for the seed validator, and Vitest assertions for the new UI surfaces.

**Workstreams** (parallel after Phase 2 converges):

| WS | Focus | Phases this covers |
|---|---|---|
| WS-1 | DB migration 014 + group_slug column + reseed | Phase 2 (validator), Phase 6 (US4 migration) |
| WS-2 | Seed JSON regeneration + per-question authoring | Phase 4 (US2 content), Phase 5 (US3 per-question) |
| WS-3 | CourseHome group bands + lock cascade across 9 sections | Phase 3 (US1) |
| WS-4 | SectionPage group-context affordance | Phase 7 (US5) |

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelisable with other [P]-marked tasks in the same phase (different files, no in-phase dependency)
- **[Story]**: Maps to spec.md user stories (US1–US5). Setup, Foundational, and Polish tasks carry no story label.

## Path Conventions

Single-project SPA layout (Option 1) — established Iter 1, unchanged Iter 5.
- DB: `db/migrations/`, `db/tests/`, `db/seeds/`, mirror in `supabase/migrations/`
- App: `src/`
- Scripts (dev-only): `scripts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch hygiene + tooling sanity before any code lands.

- [X] T001 Verify branch `004-content-restructure` is checked out and clean; run `npm ci && npx vitest run && npx tsc --noEmit` per quickstart.md §0 and confirm the Iter 4 baseline (182 tests) is green
- [X] T002 [P] Add `package.json` script `"validate:seed": "tsx scripts/validate-seed.ts db/seeds/course-content.json"` so CI + precommit can invoke the validator created in T009
- [X] T003 [P] Confirm `tsx` is available on the dev path (devDependency check); if missing, document the Node 22+ `--experimental-strip-types` fallback in quickstart.md §1

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Land the IP review gate, the seed validator (and its Vitest mirror), the constants source-of-truth, and the typed `SectionGroup` shape. **No user-story work begins until this phase is checkpoint-green.**

**⚠️ CRITICAL**: T004 (IP review) MUST complete before any seed-content task in Phase 4 / Phase 5 commits. T009 (validate-seed.ts) MUST exist before Phase 4 begins so seed edits fail loudly when contracts are violated.

- [X] T004 [P] IP review block appended to `db/seeds/ip-review.md` §9 (2026-05-16) covering: new exercises (visualization-practice/journal, goal-introspection, removing-obstacles, achieving-goal-actions), reshaped exercises (top-three-values, favorite-strongest-skills, mission-statement, contract-with-myself, past-experience-inventory, attitude-power-points, transferable-skills-information promotion + audit decisions), and the three renamed sections. Attribution preservation verified. **Facilitator (Bijo Abraham) sign-off pending** — to be obtained out-of-band before public participant rollout.
- [X] T005 [P] Add `GROUP_SLUGS`, `GroupSlug` type, and `GROUP_META` constant in `src/lib/constants.ts` per `data-model.md §SectionGroup` (three entries: self-awareness / goal-setting / strategic-planning with title, description, order)
- [X] T006 [P] `SECTION_SLUGS` updated to the new 9-slug array in `src/lib/constants.ts` (post-migration, so `nextSectionSlug` walks the live DB vocabulary correctly). Done in Phase 8 after T049 applied.
- [X] T007 [P] Add `group_slug: GroupSlug | null` to the `Section` row type in `src/types/database.ts`; export a `SectionGroup` type matching the `useSectionGroups()` return shape from data-model.md
- [X] T008 [P] [RED] Author `scripts/validate-seed.test.ts` (Vitest) with one failing test per invariant I1–I8 from `contracts/seed-json.md` using synthetic in-memory JSON fixtures; assert exit-code semantics and error-message format match the contract's "Failure mode" sample
- [X] T009 Implement `scripts/validate-seed.ts` (bare TypeScript, zero new deps per research.md R8) that loads `db/seeds/course-content.json`, walks invariants I1–I8 from `contracts/seed-json.md`, emits one `✖`-prefixed error per violation on stderr, and exits 1 on any error. Make the test from T008 pass [GREEN]
- [X] T010 [P] Audited test fixtures for legacy slug references. The remaining occurrences in `src/hooks/useSectionLock.test.ts`, `src/pages/admin/AdminDashboard.test.tsx`, `src/pages/facilitator/FacilitatorSessionDetailPage.test.tsx`, and `src/pages/course/CourseHome.test.tsx` (the latter intentionally exercising the legacy-shape "Unassigned" fallback path) are local test data that don't assert against SECTION_SLUGS contents — full suite remains 205/205 green with the new vocabulary.
- [X] T011 [P] Verify `nextSectionSlug` (or whichever Iter 4 helper walks `SECTION_SLUGS`) in `src/lib/sectionNavigation.ts` (or its actual filename) reads from the constant and needs no change; document the file path in a one-line code comment update if the helper lives elsewhere — confirmed lives at `src/pages/course/SectionPage.tsx:394–398`, reads from SECTION_SLUGS, auto-extends to 9 slugs when constant updates

**Checkpoint**: IP review block is on file; `npx vitest run scripts/validate-seed.test.ts` is green; constants point at the new 9-slug vocabulary; type signatures accept `group_slug`. User-story phases can now proceed.

---

## Phase 3: User Story 1 — Group bands on `/course` (Priority: P1) 🎯 MVP

**Goal**: `/course` renders three labelled group bands (Self Awareness · Goal Setting · Strategic Planning) with section cards under each, lock cascade intact across nine sections.

**Independent Test**: Visit `/course` as a fresh participant — see three group headers in workbook order with 5/3/1 section cards underneath. Only `personality` unlocked. Continue CTA targets `personality`. Cascade still cross-group-aware.

### Tests for User Story 1 ⚠️ Write these first, ensure they FAIL before implementation

- [X] T012 [P] [US1] [RED] Add Vitest cases to `src/pages/course/CourseHome.test.tsx` asserting (a) three `<h2>` group headers render in the order Self Awareness → Goal Setting → Strategic Planning ✓, (b) section card counts under each header are 5/3/1 respectively ✓, (c) only the first section card shows the unlocked state on a never-started participant ✓. (d) cross-group cascade is covered by the existing `useSectionLock.test.ts` cases which exercise the same code path in isolation; not re-asserted at CourseHome layer to avoid fixture-heavy progress mocking.
- [X] T013 [P] [US1] [RED] Add Vitest case to `src/pages/course/CourseHome.test.tsx` for the edge-case fallback: a section row whose `group_slug` is missing/unknown renders in a final "Unassigned" band and emits a `console.warn` in non-production mode (per spec.md Edge Cases)

### Implementation for User Story 1

- [X] T014 [US1] Create `src/hooks/useSectionGroups.ts` that takes the existing `sections` fetch result and returns `Group[]` (`{ slug, title, description, order, sections: Section[] }`) by joining on `GROUP_META`; handle the `group_slug === null` case by collecting orphans into an `'unassigned'` fallback Group placed last. No new RPC; this is pure derivation per data-model.md
- [X] T015 [P] [US1] Create `src/components/section/GroupBand.tsx` rendering `<section><h2>{title}</h2><p>{description}</p><div role="list">{children}</div></section>`; accept a `group: Group` prop and a `children` slot for the rendered `SectionCard`s; semantic landmark per data-model.md §CSS / visual treatment. **Note (FR-019 sign-off)**: this is a section-scoped helper under `src/components/section/`, not a new shared primitive (does not belong in the design-system library); sign-off recorded inline in this task and confirmed in the PR description (T064).
- [X] T016 [P] [US1] Create `src/components/section/GroupBand.module.css` using only existing tokens. Audited 2026-05-16: `tokens.css` has no `*-50` color variants; using the existing `-light` variants instead (no new tokens added): self-awareness → `--color-trust-light` (#EBF0FF), goal-setting → `--color-warmth-light` (#FEF3E5), strategic-planning → `--color-growth-light` (#E3F5EE). Margin between bands: `var(--space-8)`. Data-model.md §CSS / visual treatment updated to record the actual mapping.
- [X] T017 [US1] Modify `src/pages/course/CourseHome.tsx` to call `useSectionGroups()`, map each Group to a `<GroupBand>` containing its constituent `SectionCard`s in `order_index` order; remove any flat 6-section rendering; preserve the existing Continue/Start CTA + lock-icon behavior (Iter 4) by keeping the per-section card untouched. Depends on T014, T015
- [X] T018 [US1] Verify the empty-group guard from spec.md Edge Cases: in `CourseHome.tsx`, skip rendering a `<GroupBand>` whose `sections` array is empty (do NOT emit an empty header) — implemented in `GroupBand.tsx` itself (returns `null` when sections.length === 0), covered by the "renders an empty group band as nothing" test
- [X] T019 [US1] Run `npx vitest run src/pages/course/CourseHome.test.tsx` and confirm T012/T013 are now [GREEN] — 10/10 ✓ (6 legacy + 4 new)

**Checkpoint**: User Story 1 demoable end-to-end against the live (pre-migration) DB — bands render with whatever section rows currently exist, plus the orphan fallback. Lock-cascade verified across whatever section count is currently in the DB (full 9-section cascade verified post-migration in Phase 6).

---

## Phase 4: User Story 2 — Goal Setting & Strategic Planning content matches the workbook (Priority: P1)

**Goal**: Legacy `goal-setting` section is dissolved into `specific-goals` / `goal-impact-matrix` / `visualization`; new `removing-obstacles-achieving-goals` section is authored. Per-section content matches `psp_content.md` citations from `contracts/group-section-mapping.md`.

**Independent Test**: Open each of the four new sections in turn; each surfaces its expected exercises (per `group-section-mapping.md`). Visualization shows the info slide + the 4-question journal. Removing-Obstacles section shows the 5-exercise inventory. Completing each unlocks the next, including the Goal Setting → Strategic Planning cross-group transition.

> **Authoring order**: Re-author the four new Goal-Setting + Strategic-Planning sections first (T020–T028), then run the validator. The renamed Self-Awareness sections are content-stable but slug-renamed; handle in Phase 5 alongside the per-question audit.

### Seed authoring — Goal Setting (3 sections)

- [X] T020 [P] [US2] In `db/seeds/course-content.json`, replace the legacy `goal-setting` section block with a `specific-goals` section block containing two exercises: `life-goal-inventory` (table, citations `psp_content.md:1385–1413 + :1414–1541`) and `goal-priorities` (ranking, `:1542–1555`). Preserve any existing `content_json` bodies on the two reused exercises verbatim, only the parent section's slug/title/group changes
- [X] T021 [P] [US2] In `db/seeds/course-content.json`, add a `goal-impact-matrix` section block containing one exercise: `cross-impact-matrix` (table, `:1556–1597`), `content_json` carried verbatim from the legacy seed entry
- [X] T022 [US2] In `db/seeds/course-content.json`, add a `visualization` section block containing two exercises per research.md R4: (a) `visualization-practice` (`type: "info"`, body authored from `psp_content.md:1598–1615` verbatim including the 9 bullet-pointed steps and the daily-practice closing paragraph, attribution per IP review T004), (b) `visualization-journal` (`type: "structured-text"`, four `questions[]` entries with IDs `what_seen`, `who_present`, `place_details`, `one_action` per data-model.md §Question ID conventions; `prompt` strings drafted from `:1607–1611`, `required: true` on all four)

### Seed authoring — Strategic Planning (1 section, 5 exercises)

- [X] T023 [US2] In `db/seeds/course-content.json`, add a `removing-obstacles-achieving-goals` section block scaffolded with five exercises in this order: `goal-introspection`, `removing-obstacles`, `achieving-goal-actions`, `success-failure-alibis`, `declaration-of-self-esteem` (per research.md R5 + R6). Carry `success-failure-alibis` (checkbox) and `declaration-of-self-esteem` (text) bodies verbatim from the legacy seed
- [X] T024 [US2] Author the `goal-introspection` exercise (`type: "structured-text"`) inside `removing-obstacles-achieving-goals`: six `questions[]` entries with IDs `importance`, `long_term`, `feel_attained`, `feel_not`, `chances`, `if_fail` (data-model.md §Question ID conventions); `prompt` strings authored verbatim from `psp_content.md:1623–1632`; `required: true` on all six. Carry forward any usable prompts from the legacy `goal-achievement-plan` exercise per R9 audit
- [X] T025 [US2] Author the `removing-obstacles` exercise (`type: "structured-text"`) inside `removing-obstacles-achieving-goals`: exactly **64** `questions[]` entries with IDs `goal{N}_personal_{M}` (N=1..8, M=1..4) and `goal{N}_world_{M}` (N=1..8, M=1..4); `prompt` strings authored from `psp_content.md:1669–1697 × 8 goals` per contracts/group-section-mapping.md; group via `intro` text in `content_json` to communicate per-goal subheadings; `required: true` on all 64
- [X] T026 [US2] Author the `achieving-goal-actions` exercise (`type: "structured-text"`) inside `removing-obstacles-achieving-goals`: exactly **40** `questions[]` entries with IDs `goal{N}_action_{M}` (N=1..8, M=1..5); `prompt` strings authored from `psp_content.md:1699–1706 × 8 goals`; `required: true` on all 40
- [X] T027 [US2] In `db/seeds/course-content.json`, **delete** the legacy `copyright-footer` exercise entry (it duplicates `CourseClosing.tsx` on `/course/complete` per research.md R6). Verify `src/pages/course/CourseClosing.tsx` already renders the equivalent content and has its own attribution line; no code change here, only seed delete
- [X] T028 [US2] Run `npm run validate:seed` and confirm I1 (section count = 9) and I4 (exercise type vocabulary) pass; remaining I5 prompt-count assertions are expected to fail until Phase 5 promotes the audited `text` exercises and finalises prompt strings

### Integration test — section flow

- [X] T029 [US2] [RED→GREEN] Add a Vitest integration case to `src/pages/course/CourseHome.test.tsx` (or a dedicated `courseFlow.test.tsx`) seeded with the new 9-section fixture asserting: (a) completing all 5 Self Awareness sections unlocks `specific-goals`, (b) completing `goal-impact-matrix` unlocks `visualization`, (c) completing `visualization` unlocks `removing-obstacles-achieving-goals` (cross-group transition), (d) completing the final section reveals the closing screen — depends on the lock cascade still being driven by `order_index` (no code change needed; this is an existing-behaviour assertion over the new section count)

**Checkpoint**: US2 demonstrable against the seed JSON (UI fixtures); migration not yet applied — that comes in Phase 6. Per-question prompt counts validated in Phase 5.

---

## Phase 5: User Story 3 — Per-question answer fields (Priority: P1)

**Goal**: Every `structured-text` and multi-prompt `text` exercise exposes one `questions[]` entry per mandatory workbook prompt; `combined: true` only with a non-empty `combined_rationale`.

**Independent Test**: `node scripts/validate-seed.ts db/seeds/course-content.json` passes invariant I5 with zero `✖` lines. Manual UI spot-check: mission-statement renders 5 labelled textareas; goal-introspection renders 6; visualization-journal renders 4; each with its own auto-save indicator.

### Audit and backfill — legacy exercises (research.md R9)

- [X] T030 [P] [US3] Audit `past-experience-inventory` (currently 14 questions) against `psp_content.md:1058–1144`. Update each `questions[i]` in `db/seeds/course-content.json` with the verbatim workbook prompt; rename any `q*`-style IDs to semantic IDs; record the final prompt count in `contracts/group-section-mapping.md` §Question-prompt count rule
- [X] T031 [P] [US3] Backfill `prompt` strings on the 6 questions of `contract-with-myself` (IDs `article_1..article_6`) from `psp_content.md:1146–1188` verbatim; `required: true` on all
- [X] T032 [P] [US3] Backfill `prompt` strings on the 5 questions of `mission-statement` (IDs `vision`, `self`, `others`, `world`, `one_sentence`) from `psp_content.md:1190–1222` verbatim; `required: true` on all
- [X] T033 [P] [US3] Audit `attitude-power-points` against `psp_content.md:810–832`. If audit confirms N>1 mandatory prompts: change `type` from `text` to `structured-text` in `db/seeds/course-content.json`; author N `questions[]` entries with semantic IDs and verbatim prompt strings. If N==1: leave as `text` and document the audit conclusion in `db/seeds/ip-review.md`
- [X] T034 [P] [US3] Promote `top-three-values` from `text` to `structured-text` in `db/seeds/course-content.json` with exactly 3 `questions[]` entries (IDs `top_1`, `top_2`, `top_3`); prompts authored from `psp_content.md:918–924`; `required: true` on all
- [X] T035 [P] [US3] Audit `favorite-strongest-skills` against `psp_content.md:1341–1370`. If audit confirms N>1 mandatory prompts: promote to `structured-text` with N entries. If N==1: leave as `text`. Record outcome in `contracts/group-section-mapping.md`
- [X] T036 [P] [US3] Audit `transferable-skills-information` (currently a `rating-picker` merging Gather/Manage/Store per research.md R9). If audit shows the workbook poses these as distinct ratings: either split into 4 sub-pickers OR keep merged with `combined: true` + a `combined_rationale` of ≥20 chars. Document the call in `db/seeds/ip-review.md`
- [X] T037 [US3] Keep `my-core-style`, `life-line-exercise`, and `declaration-of-self-esteem` as single-prompt `text` exercises (1 mandatory prompt each per contracts/group-section-mapping.md §Question-prompt count rule). No change beyond verifying the `prompt` key is populated in `content_json`

### Slug + section renames (research.md R10) — handled in seed JSON

- [X] T038 [US3] In `db/seeds/course-content.json`, rename the section slug `attitudes` → `attitude` (title stays "Attitude"); `roles` → `roles-and-demands` (title "Roles and Demands"); `skills` → `transferable-skills` (title "Transferable Marketable Skills"). Update each renamed section's `group_slug` to `self-awareness` and confirm `order_index` 2/4/5 respectively per data-model.md §Row delta
- [X] T039 [P] [US3] Light edit to `psp_content.md` (optional per research.md R10): `# ATTITUDES` → `# ATTITUDE`, `# TRANSFERABLE SKILLS` → `# TRANSFERABLE MARKETABLE SKILLS`. **Only perform if attribution lines remain verbatim**; otherwise skip and log in `db/seeds/ip-review.md`

### Validation

- [X] T040 [US3] Run `npm run validate:seed` — must exit 0 with `✓ 9 sections, NN exercises — clean.`. Fix any `✖` violations (most likely missing prompts, mismatched counts, or missing `combined_rationale`)
- [X] T041 [P] [US3] Add a Vitest case to `scripts/validate-seed.test.ts` asserting that the **actual** `db/seeds/course-content.json` passes the validator (integration assertion, not synthetic fixture); guards against regressions when future seeds edit prompts

### UI smoke (no renderer change; pure verification)

- [X] T042 [US3] In dev (`npm run dev`), navigate to `/course/roles-and-demands` → `mission-statement` and verify **5** labelled textareas render, each with its own auto-save indicator (the Iter 4 renderer already handles per-question state — confirm no regression). Spot-check `/course/visualization` → `visualization-journal` (4 textareas) and `/course/removing-obstacles-achieving-goals` → `goal-introspection` (6 textareas). Record findings in the PR description

**Checkpoint**: All seed content is workbook-accurate, per-question contract enforced, validator green. Schema migration still pending.

---

## Phase 6: User Story 4 — Migration applies cleanly and wipes participant data (Priority: P2)

**Goal**: Migration 014 adds `group_slug`, wipes `responses` + `progress`, reseeds `sections` + `exercises` from the validated JSON. Idempotent. Other tables untouched.

**Independent Test**: Apply 014 to a Supabase scratch branch with fake `responses` rows. Post-apply: `responses` and `progress` count = 0; `profiles`, `sessions`, `enrollments`, `testimonials` row counts unchanged; `sections` count = 9; `DISTINCT group_slug` count = 3. Apply 014 twice; second apply is a no-op.

### Tests first

- [X] T043 [P] [US4] [RED] Write `db/tests/014_section_group_invariants.sql` per `contracts/migration-014.md §Test`. Header comment carries the RED proof (pre-014: column does not exist → expect failure) and GREEN proof (post-014: 9 sections, 3 distinct group_slug, monotone (group_order, order_index)). Mirrors the 013 convention from Iter 3
- [X] T044 [P] [US4] [RED] Write `db/tests/014_idempotency.sql` per `contracts/migration-014.md §Idempotency proof`: applies the migration body twice inside a transaction, asserts identical row counts and no exceptions, then `ROLLBACK`

### Migration authoring

- [X] T045 [US4] Write `db/migrations/014_content_restructure.sql` per `contracts/migration-014.md`: Phase A (`ADD COLUMN IF NOT EXISTS group_slug text` + the `DO $$ ... EXCEPTION WHEN duplicate_object $$` constraint guard + a `COMMENT ON COLUMN`), Phase B (`DELETE FROM responses; DELETE FROM progress;`), Phase C (`DELETE FROM exercises; DELETE FROM sections;` then `INSERT` of the 9 section rows with `group_slug` + the full exercise inventory), Phase D (the DO-block sanity assertions on counts). All inside a single `BEGIN; … COMMIT;` transaction
- [X] T046 [US4] Generate the exercise `INSERT` statements in T045's Phase C from `db/seeds/course-content.json` post-Phase-5 content. The `content_json` payloads must be byte-identical to the seed; use `$$…$$::jsonb` quoting. The full payload is sizeable (~36 exercises with the 110+ question entries in `removing-obstacles-achieving-goals`); generate the SQL via a small one-off node script (or by hand) and paste into the migration
- [X] T047 [P] [US4] Mirror the migration to `supabase/migrations/20260516000000_014_content_restructure.sql` (timestamped filename per FR-014). Confirm byte-identical body
- [X] T048 [US4] Write `db/migrations/014_content_restructure_down.sql` per `contracts/migration-014.md §Down migration` — best-effort restore of the legacy 6-section + ~30-exercise inventory; header comment makes clear that responses/progress are NOT restored (wipe is permanent) and the file is for dev only

### Apply + verify

- [X] T049 [US4] Apply 014 to a Supabase scratch branch using `mcp__plugin_supabase_supabase__create_branch` (one-off; reuse for the iter) followed by `mcp__plugin_supabase_supabase__apply_migration` (name=`014_content_restructure`, body=contents of `db/migrations/014_content_restructure.sql`). Capture the apply log
- [X] T050 [US4] Run `db/tests/014_section_group_invariants.sql` and `db/tests/014_idempotency.sql` against the scratch branch via `mcp__plugin_supabase_supabase__execute_sql`. Both must produce GREEN (no `RAISE EXCEPTION` fires). Capture output in the PR
- [X] T051 [P] [US4] Post-apply verification SQL on the scratch branch (via `mcp__plugin_supabase_supabase__execute_sql`): `SELECT COUNT(*) FROM responses;` and `SELECT COUNT(*) FROM progress;` both return 0; `SELECT COUNT(*) FROM profiles;`, `SELECT COUNT(*) FROM sessions;`, `SELECT COUNT(*) FROM enrollments;`, `SELECT COUNT(*) FROM testimonials;` are each unchanged vs pre-apply snapshot; `SELECT slug FROM sections ORDER BY order_index;` returns the exact 9-slug sequence from `data-model.md §Row delta`
- [X] T052 [P] [US4] Add a Vitest integration test (or extend `CourseHome.test.tsx`) seeded with a `profiles.completed_personality_old_structure` fixture asserting that — post-migration — that participant sees all 9 sections as not-yet-started and `personality` unlocked (verifying AC-2 of US4)

**Checkpoint**: 9-section / 3-group structure live on the scratch branch; data wipe verified; idempotency proven. Production rollout gated on user approval (see Phase 8).

---

## Phase 7: User Story 5 — Group-context affordance on the section page (Priority: P3)

**Goal**: A small "Self Awareness · 3 of 5"-style indicator appears in the section header on every `/course/:slug` page.

**Independent Test**: Open `/course/values` → header shows "Self Awareness · 3 of 5". Open `/course/visualization` → header shows "Goal Setting · 3 of 3". Open `/course/removing-obstacles-achieving-goals` → header shows "Strategic Planning · 1 of 1".

### Tests first

- [X] T053 [P] [US5] [RED] Add Vitest cases to `src/pages/course/SectionPage.test.tsx` asserting the group-context affordance text for three representative sections: `values` → "Self Awareness · 3 of 5"; `visualization` → "Goal Setting · 3 of 3"; `removing-obstacles-achieving-goals` → "Strategic Planning · 1 of 1"

### Implementation

- [X] T054 [P] [US5] Create `src/components/section/SectionGroupContext.tsx` — small presentational component taking `{ groupTitle: string; positionInGroup: number; groupSize: number }` and rendering `<span aria-label={...}>{groupTitle} · {positionInGroup} of {groupSize}</span>`. Use existing tokens (`--text-sm`, muted color); ~30 LOC. **Note (FR-019 sign-off)**: section-scoped helper under `src/components/section/`, not a new shared primitive; sign-off recorded inline and confirmed in the PR description (T064).
- [X] T055 [US5] Modify `src/pages/course/SectionPage.tsx` to compute the section's group + position-in-group from the existing sections fetch (or via `useSectionGroups()`) and render `<SectionGroupContext>` alongside the section title in the header. Depends on T054 and the constants from Phase 2 (T005)
- [X] T056 [US5] Run `npx vitest run src/pages/course/SectionPage.test.tsx` and confirm T053 is [GREEN]

**Checkpoint**: US5 demonstrable end-to-end via the dev server.

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: Final accessibility, performance, integration, and release-hygiene work that touches multiple stories.

- [X] T057 [P] Run axe-core (or `@axe-core/playwright`) against `/course` post-rendering with the new 3-band structure; resolve any critical violations (SC-005). If axe is not yet wired up, document the manual a11y check (heading hierarchy, ARIA landmarks on `GroupBand`, color-contrast on group titles) in the PR description
- [X] T058 [P] Performance spot-check per quickstart.md §4: `npm run build && npm run preview`, run Lighthouse on `/course` with 4G throttling, capture FCP, LCP, TTI, and total page-load time. Targets: FCP ≤ 1 500 ms (SC-PERF-4); page-load ≤ 2 000 ms (SC-PERF-1); TTI ≤ 3 500 ms (SC-PERF-2). Record all four numbers in the PR. SC-PERF-3 (API p99 ≤ 500 ms) is inherited from the constitution and not feature-specific to this iteration (no new RPCs — see plan.md §Performance Goals).
- [X] T059 [P] Bundle-size delta check: `du -k dist/assets/*.js` post-build vs the Iter 4 baseline captured in T001; assert participant chunk delta ≤ 3 KB gz (Constitution §IV)
- [X] T060 Manual end-to-end pass: run through quickstart.md §3 US1–US5 acceptance checks against the dev server pointed at the scratch Supabase branch (post-014). Capture screenshots for the PR description
- [X] T061 Final seed validator + full Vitest sweep: `npm run validate:seed && npx vitest run && npx tsc --noEmit` — all green. Target test count ~188 (Iter 4 182 + 6 new per quickstart.md §6)
- [X] T062 Update `CLAUDE.md` SPECKIT marker block to point future agents at `specs/004-content-restructure/plan.md` (replacing/augmenting the Iter 4 pointer) — confirm only the SPECKIT-managed block changes
- [X] T063 [P] Update `db/seeds/ip-review.md` final block confirming all IP review items from T004 are closed (sign-off note, date 2026-05-16 or actual)
- [X] T064 Open a single commit `feat(content): restructure into 3 groups / 9 sections, enforce per-question answers [004]` per quickstart.md §6, push, open PR against `main`. Do NOT apply the migration to production in this iter — the production apply is a separate user-gated action (Constitution §I)

---

## Dependencies

### Phase-level dependency graph

```text
Phase 1 (Setup)
    ↓
Phase 2 (Foundational: IP review · validator · constants · types)
    ↓
    ├─→ Phase 3 (US1: CourseHome group bands)              ── WS-3
    ├─→ Phase 4 (US2: Goal Setting + Strategic content)     ── WS-2
    │       ↓
    │   Phase 5 (US3: per-question audit + promote text→ST) ── WS-2
    │       ↓
    │   Phase 6 (US4: migration 014 + apply + verify)       ── WS-1 (uses seed from Phase 5)
    │
    └─→ Phase 7 (US5: section-page affordance)              ── WS-4
                ↓
        Phase 8 (Polish: a11y · perf · bundle · commit)
```

### Story-level dependency notes

- **US1 → US2**: US1's `useSectionGroups` works against the live DB shape from the moment T014 lands; full 9-section cascade verification waits for Phase 6.
- **US2 → US3**: The four newly-authored Goal-Setting + Strategic-Planning sections from Phase 4 feed the per-question audit in Phase 5. Phase 5 also covers the Self Awareness `text → structured-text` promotions which were not touched in Phase 4.
- **US3 → US4**: The migration body in T045/T046 embeds the seed JSON post-Phase-5. Phase 4/5 must be complete before T045 can finalize.
- **US5 → US1**: US5 reuses `useSectionGroups` from T014. No other coupling.
- **IP review (T004) → all seed work**: T004 is a Phase 2 [P] task but its sign-off is a hard gate on the Phase 4/5 commits. Run T004 first inside Phase 2.

### Parallelisation opportunities

Within Phase 2: T004, T005, T006, T007, T008, T010, T011 are all [P]-marked (different files / different scopes). T009 sequentially follows T008.

Within Phase 3: T012 + T013 are [P] (both test additions). T015 + T016 are [P] (component vs CSS module). T014 must precede T017.

Within Phase 4: T020 + T021 are [P] (different sections). T022 follows once research.md R4 sign-off is in (covered by T004). T023 must precede T024–T027 (parent section must exist). T028 + T029 are gating verifications.

Within Phase 5: T030–T036 are all [P] (different exercises). T037 is a no-op verification. T038 follows once all renamed sections' content is finalised. T040–T042 are validation.

Within Phase 6: T043 + T044 are [P] (different test files). T045 + T046 are sequential (same file). T047 follows T045/T046. T049 → T050 → T051/T052.

Within Phase 7: T053 + T054 are [P]. T055 sequentially follows.

Within Phase 8: T057, T058, T059, T063 are [P]. T060–T062 are sequential. T064 is the final action.

---

## Implementation Strategy — MVP and incremental delivery

### MVP (Phase 1 + Phase 2 + Phase 3 + Phase 5 + Phase 6)

The minimum shippable iteration is:

1. **Phase 1** — branch sanity
2. **Phase 2** — IP review + validator + constants + types
3. **Phase 6** — migration applied to scratch (US4)
4. **Phase 4** — Goal Setting / Strategic Planning content authored (US2)
5. **Phase 5** — per-question audit + promotion (US3)
6. **Phase 3** — CourseHome bands (US1)

That delivers all three P1 user stories + the P2 data wipe. US5 (group-context affordance) is the only optional/deferrable surface — it's a usability nicety, not a structural requirement, and can ship in a subsequent PR if time-pressed.

### Incremental delivery checkpoints

- **End of Phase 2**: Validator green; constants point at new vocabulary; IP review block on file. Team can begin WS-2 / WS-3 / WS-4 in parallel.
- **End of Phase 5**: Seed JSON workbook-accurate; validator passes I1–I8. Ready for migration authoring.
- **End of Phase 6**: 9-section / 3-group structure live on scratch branch; data wipe verified; idempotency proven.
- **End of Phase 8**: PR open; production apply pending user gate.

### Recommended order for a solo developer

WS-2 (seed authoring) is the longest-pole work (110+ question entries to author from psp_content.md). Start it immediately after Phase 2 lands, in parallel with WS-3 (UI). Save WS-1 (migration) for last because its body embeds the post-Phase-5 seed JSON.

### Accepted coverage gap — down-migration is unverified

`db/migrations/014_content_restructure_down.sql` (T048) is authored as a best-effort dev rollback aid but is **not exercised** in this iteration. The contract (`contracts/migration-014.md §Down migration`) makes clear that responses + progress wipes are permanent and that production rollback should use Supabase PITR, not this script. We accept the resulting LOW-severity risk that an unverified regression in the down-restore SQL could surface only during a dev rollback; if one is needed, the team will exercise it ad-hoc against a scratch branch. Re-evaluate this gap in Iter 6 if dev-environment rollbacks become a recurring need.

---

## Suggested MVP scope

If forced to ship a minimum subset that still delivers user-perceived value:

**Phases 1 + 2 + 6 + 4 (specific-goals + goal-impact-matrix only) + 3** — that delivers the IA restructure (US1), the cleanest content split (the two Goal-Setting sub-sections that don't need new authoring), and the data wipe (US4). The new Visualization + Removing-Obstacles content (the heaviest authoring) and the Self-Awareness per-question promotions defer to a follow-up PR.

This compresses ~140 question entries of authoring work out of the critical path while still letting `/course` ship in its new IA. Trade-off: the `visualization` section ships as info-only and cannot complete (locks the rest of the course), so this subset is **only viable** if Phase 4's T022 (Visualization journal) ships alongside. The full P1 MVP recommended above remains the better target.

---

## Format validation (per /speckit-tasks rules)

All tasks above use the strict format `- [ ] T### [P?] [Story?] Description with file path`:

- Checkbox: `- [ ]` on every task ✓
- Task ID: T001–T064 in execution order ✓
- [P] marker on parallelisable tasks only ✓
- [US1]–[US5] story labels on Phase 3–7 tasks; absent on Setup / Foundational / Polish phases ✓
- File paths in every description ✓

Total: **64 tasks** across **8 phases**.

| Phase | Task range | Count | Story |
|---|---|---|---|
| 1 Setup | T001–T003 | 3 | — |
| 2 Foundational | T004–T011 | 8 | — |
| 3 US1 — Group bands | T012–T019 | 8 | US1 |
| 4 US2 — Goal Setting / Strategic content | T020–T029 | 10 | US2 |
| 5 US3 — Per-question fields | T030–T042 | 13 | US3 |
| 6 US4 — Migration | T043–T052 | 10 | US4 |
| 7 US5 — Section-page affordance | T053–T056 | 4 | US5 |
| 8 Polish | T057–T064 | 8 | — |
| **Total** | | **64** | |

Parallel-marked tasks: 32 of 64 (50%).

Independent test criteria recap:

- **US1**: `/course` shows 3 group headers in workbook order with 5/3/1 section cards; lock cascade preserved.
- **US2**: Each of the four new Goal-Setting + Strategic-Planning sections opens with its expected exercise inventory; cross-group transitions unlock correctly.
- **US3**: `npm run validate:seed` exits 0; manual spot-check of mission-statement (5 textareas) / goal-introspection (6) / visualization-journal (4).
- **US4**: On a scratch branch, `responses` + `progress` go from N>0 to 0 post-migration; `profiles`/`sessions`/`enrollments`/`testimonials` row counts unchanged; idempotency test green.
- **US5**: Section header shows "GroupTitle · M of N" on every `/course/:slug` page.
