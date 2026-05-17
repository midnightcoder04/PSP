---
description: "Task list for Iteration 4: slide navigation, exercise UX rework, testimonials"
---

# Tasks: Slide Navigation, Sequential Reveal, Exercise UX Rework & Testimonials

**Input**: Design documents from `/specs/003-slide-nav-ux-rework/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/*

**Tests**: REQUIRED. The project's Constitution §II ("Test-First Development") is NON-NEGOTIABLE — every implementation task is preceded by a `[RED]` test task in its own user-story phase. Skipping tests is a Constitution violation.

**Organization**: Tasks are grouped by user story (US1 through US8) so each story can be implemented, tested, and shipped independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: Maps the task to a user story (US1…US8); omitted for Setup/Foundational/Polish
- All paths are repo-root relative

## Path Conventions

Single-project SPA at repository root: `src/`, `db/`, `supabase/`, `scripts/`, `specs/`.

---

## Implementation Status (2026-05-15)

**Full iteration shipped** — 76 of 86 tasks complete on branch `003-slide-nav-ux-rework`. All 8 user stories (US1–US8) plus Polish are merged in code; the remaining 10 tasks are manual browser walkthroughs + the accessibility audit (T085) reserved as owner actions.

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 (Setup, T001–T003) | ✓ | Branch, deps, baseline. |
| Phase 2 (Foundational, T004–T012) | ✓ | Migrations 011 + 012 applied to hosted project `okedskadkspeiyxjslqc`. Types, constants, lib/exerciseCompletion shipped. IP rights inherited (owner decision 2026-05-15). |
| US1 — slide nav + locking (T013–T028) | ✓ | Hooks, components, page refactors. **T029 (manual verification) pending owner.** |
| US2 — structured-text (T030–T034) | ✓ | Component + tests + seed rewrites for past-experience-inventory, contract-with-myself, mission-statement (14 / 6 / 5 sub-questions). **T035 manual verification pending.** |
| US3 — WATUSI auto-count + slide-group (T036–T041) | ✓ | `useWatusiCounts`, RankingExercise extension, `slide_group=2` linking checklist + ranking, derives_from wired through SectionPage. **T042 manual verification pending.** |
| US4 — Values widget + gated proceed (T043–T050) | ✓ | `useValuesTotal`, `ValueBudgetWidget`, currency-col TableExercise extension, `total_target: 100000` in seed. is_complete = total === target (right arrow gates automatically). **T051 manual verification pending.** |
| US5 — Testimonials (T052–T062) | ✓ | TestimonialModal, TestimonialList, CourseClosing, admin + facilitator pages (lazy-loaded), routes wired in App.tsx, Sidebar entries added. RLS integration test scaffolded (auto-skip without creds). **T063 manual verification pending.** |
| US6 — Drag-and-drop ranking (T064–T066) | ✓ | RankingExercise supports `interaction: 'drag'` via @dnd-kit/sortable with KeyboardSensor + PointerSensor + TouchSensor. Applied to attitude-types-watusi and goal-priorities in seed (Roles has no ranking exercises). **T067 manual verification pending.** |
| US7 — Rating picker (T068–T072) | ✓ | RatingPickerExercise (radio groups 1–5 with labels), three transferable-skills exercises rewritten to `rating-picker`. **T073 manual verification pending.** |
| US8 — Goal Setting patterns (T074–T075) | ✓ | Audit produced (`goal-setting-audit.md`); two changes applied: goal-priorities → drag, goal-achievement-plan → structured-text (10 sub-questions). **T076 manual verification pending.** |
| Polish (T077–T086) | ✓ where automatable | T077 (bundle delta), T078 (full suite), T080 (security audit), T081 (no-bypass), T082 (lazy-chunks), T083 (post-impl Constitution check), T084 (open Q resolution), T086 (Iteration 5 stub) all done. **T079 (quickstart polish) + T085 (axe-core a11y audit) pending owner.** |

**Test summary**: `npm test -- --run` → **181 passing / 0 failing / 52 skipped** (33 test files). Skipped tests are the hosted-DB integration suite (RPC + testimonials) which auto-skip without `VITE_SUPABASE_URL` + `SUPABASE_SECRET_KEY`.

**Bundle delta**: Participant route ≈ **+21 KB gz** (target was 15 KB; overage documented in `bundle-delta.md`; root cause is `@dnd-kit/*` bundled into SectionPage chunk — recommended mitigation in Iteration 5 is to lazy-load RankingExercise via React.lazy).

**Hosted DB state** (project `okedskadkspeiyxjslqc`):
- Migration 011: slide_group column + type CHECK with `structured-text`, `rating-picker` ✓
- Migration 012: testimonials table + 5 RLS policies + `set_updated_at()` trigger ✓
- Seed: 6 sections with reading_material; identifying-attitudes + attitude-types-watusi share slide_group=2; past-experience-inventory + contract-with-myself + mission-statement + goal-achievement-plan as structured-text; transferable-skills-* as rating-picker; values-shopping-spree with total_target=100000.

**Manual / owner tasks remaining** (10):
- T029, T035, T042, T051, T063, T067, T073, T076 — per-story manual UI verifications (use `npm run dev` against hosted DB).
- T079 — quickstart.md polish based on what surfaced during manual testing.
- T085 — accessibility audit (axe-core / Playwright skill).

---

## User Story Map

| Story | Priority | Title | ACs covered | Workstream |
|-------|----------|-------|-------------|------------|
| US1 | P1 (MVP) | Slide navigation, intro slide, section locking | AC-1, AC-2, AC-3 | WS-1 |
| US2 | P2 | Structured multi-question text exercises (Past Exp / Contract / Mission) | AC-7 | WS-5 |
| US3 | P2 | WATUSI auto-count + linked slide-group | AC-4 | WS-2 |
| US4 | P2 | Values shopping spree budget widget + gated Proceed | AC-5 | WS-3 |
| US5 | P2 | Testimonials (submission + dashboards + RLS) | AC-10, AC-11, AC-12 | WS-8 |
| US6 | P3 | Drag-and-drop ranking (Roles) | AC-6 | WS-4 |
| US7 | P3 | Rating-picker exercise (Transferable Skills) | AC-8 | WS-6 |
| US8 | P3 | Goal Setting pattern application | AC-9 | WS-7 |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch readiness, dependencies, and baseline measurements.

- [X] T001 Create branch `003-slide-nav-ux-rework` from `main` (or rebase from `002-iter2-fixes` after that PR merges); confirm working tree clean.
- [X] T002 Install `@dnd-kit/core` and `@dnd-kit/sortable` via `npm install @dnd-kit/core @dnd-kit/sortable`; verify `package.json` records the versions and `package-lock.json` updates.
- [X] T003 [P] Capture bundle baseline: run `npm run build && du -sh dist/assets/*.js.gz | sort -h | tee /tmp/bundle-before.txt` and commit the snapshot to `specs/003-slide-nav-ux-rework/bundle-baseline.txt` for later delta comparison.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, type, and library scaffolding that ALL user stories require.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete.

- [X] T004 Author SQL migration `db/migrations/011_exercise_slide_group.sql`: adds `exercises.slide_group int null`; backfills `slide_group = order_index`; extends `exercises_type_check` CHECK constraint to include `'structured-text'` and `'rating-picker'`. Mirror language per data-model.md §2.
- [X] T005 Mirror migration to `supabase/migrations/{timestamp}_011_exercise_slide_group.sql` (same SQL).
- [X] T006 Author SQL migration `db/migrations/012_testimonials.sql`: creates `public.testimonials` table, indexes, RLS policies (`testimonials_self_select`, `testimonials_self_insert`, `testimonials_self_update`, `testimonials_facilitator_select`, `testimonials_admin_select`), and the `testimonials_updated_at` trigger. Use the DDL in `contracts/testimonials-api.md` §1 verbatim.
- [X] T007 Mirror migration to `supabase/migrations/{timestamp}_012_testimonials.sql`.
- [X] T008 Apply migrations to **hosted** Supabase project (no local Docker stack). Use the Supabase MCP `apply_migration` against project `okedskadkspeiyxjslqc`. Verify with `information_schema.columns` (slide_group exists), `pg_get_constraintdef` (type CHECK includes structured-text + rating-picker), and `pg_policy` (five policies on `testimonials`).
- [X] T009 Regenerate TypeScript types: run `npm run generate-types` (or equivalent `supabase gen types typescript`); merge new generated declarations into `src/types/database.ts` adding the `testimonials` table shape, `exercises.slide_group`, plus manual additions for `SectionFraming.reading_material`, `StructuredTextContent`/`Response`, `RatingPickerContent`/`Response`, and the `interaction` / `derives_from` / `show_counts` fields on `RankingContent`. Export `Testimonial = Tables<'testimonials'>`.
- [X] T010 [P] Create `src/lib/exerciseCompletion.ts` skeleton with the type-discriminated `isComplete(type, content, response)` function and individual predicates `isStructuredTextComplete`, `isRatingPickerComplete`, `isTableComplete` (existing), `isCheckboxComplete` (existing), etc. Export an `EXERCISE_TYPE_ORDER` lookup for renderer use. Tests follow in each story phase.
- [X] T011 [P] **IP review (Constitution §Content & IP Compliance)** — Resolved 2026-05-15 by the project owner: the six `reading_material` blocks reference public, widely-attributed works (Bonnstetter/TTI, Frankl, Covey, McKeown, Bolles, Tracy) at a description level only, and inherit the existing IP grant under which the PSP workshop operates. No separate drafts file is needed. Testimonials confirmed to be user-generated content with no PSP™ content alteration; attribution lines for the workshop unaffected.
- [X] T012 Update `src/lib/constants.ts` to add `ROUTES.ADMIN_TESTIMONIALS = '/admin/testimonials'`, `ROUTES.FACILITATOR_TESTIMONIALS = '/facilitator/testimonials'`, `ROUTES.COURSE_COMPLETE = '/course/complete'`, and `EXERCISE_TYPE.STRUCTURED_TEXT = 'structured-text'`, `EXERCISE_TYPE.RATING_PICKER = 'rating-picker'`. Update the `ExerciseType` union accordingly.

**Checkpoint**: Foundation ready — user story implementation can begin in parallel.

---

## Phase 3: User Story 1 — Slide Navigation + Section Locking (Priority: P1) 🎯 MVP

**Goal**: A participant in any section experiences one slide at a time — an intro slide, then one exercise per slide — with prev/next arrow controls. The next arrow is gated by completion. On My Course, sections beyond Personality are locked until the prior section is 100% complete.

**Independent test**: A brand-new participant opens `/course`, sees five locked + one unlocked section, completes the unlocked section using only the in-slide nav controls, and on returning to `/course` finds the next section unlocked.

### Tests for User Story 1 ⚠️ Write FIRST and confirm FAIL before implementation

- [X] T013 [P] [US1] Write failing test `src/components/section/SlideNav.test.tsx` covering: renders prev/next buttons, disables next when `canGoNext=false`, hint is announced via `aria-live`, focus styles visible.
- [X] T014 [P] [US1] Write failing test `src/hooks/useSlideState.test.ts` covering: initial slide when `resumeExerciseId` is null (intro), set mid-section, fully complete (closing); next/prev clamping; gating when current slide has an incomplete exercise.
- [X] T015 [P] [US1] Write failing test `src/hooks/useSectionLock.test.ts` covering: index 0 unlocked; subsequent locked until prior `section_completed_at != null`; pure-function shape (no I/O).
- [X] T016 [P] [US1] Write failing test `src/components/section/SectionIntroSlide.test.tsx` covering: quote + opening question + why + reading_material render when present; reading block hidden when absent; Begin button fires `onBegin`.
- [X] T017 [P] [US1] Extend `src/pages/course/CourseHome.test.tsx` to assert: locked sections render `<LockIcon />`, are not buttons (use a presentational element), and expose accessible hint "Locked — complete {prereq} first".
- [X] T018 [P] [US1] Extend `src/pages/course/SectionPage.test.tsx` to assert: only one slide visible at a time (`data-active="true"` count === 1); right-arrow gating respects exercise `is_complete`; clicking next on final slide navigates to the next section.

### Implementation for User Story 1

- [X] T019 [P] [US1] Implement `src/hooks/useSlideState.ts` per `contracts/slide-nav.md` §1; pure (no Supabase); covers intro/closing edge cases and slide-group awareness from research.md R12.
- [X] T020 [P] [US1] Implement `src/hooks/useSectionLock.ts` per `contracts/slide-nav.md` §4; pure function of `sections` + `progressMap`.
- [X] T021 [P] [US1] Implement `src/components/ui/LockIcon.tsx` — small SVG, accepts `size` and `aria-label` props; default size 16px.
- [X] T022 [US1] Implement `src/components/section/SlideNav.tsx` + `SlideNav.module.css` per `contracts/slide-nav.md` §2 (button semantics, focus-visible ring, sticky bottom, mobile-responsive).
- [X] T023 [US1] Implement `src/components/section/SectionIntroSlide.tsx` + `SectionIntroSlide.module.css`. Embed the existing `SectionOpening` and add a `reading_material` block (title + content + optional `<a href>`); render a "Begin →" primary button that calls `onBegin`.
- [X] T024 [US1] Implement `src/components/section/SectionClosingSlide.tsx` + CSS — wraps the existing `SectionClosing`; on the final section (slug `goal-setting`), the bottom CTA becomes "Finish course" navigating to `/course/complete`.
- [X] T025 [US1] Extend `SectionFraming` in `src/types/database.ts` with `reading_material?: { title: string; content: string; url?: string } | null`. Update the existing `src/components/section/SectionOpening.tsx` and `SectionOpening.test.tsx` to render `reading_material` when present and to remain backwards-compatible when absent.
- [X] T026 [US1] Added `reading_material` to all six sections in `db/seeds/course-content.json` and ran `npm run db:seed` against the hosted DB. Verified via `SELECT framing->'reading_material'->>'title' FROM sections` — all six rows populated.
- [X] T027 [US1] Refactor `src/pages/course/SectionPage.tsx` to the slide state machine per `contracts/slide-nav.md` §3: derive `slideGroups` from exercises (group by `slide_group`, default to `order_index`); render intro slide first, then each slide group, then `SectionClosingSlide`; integrate `SlideNav`. Preserve the existing `renderExercise` switch for back-compat with current types.
- [X] T028 [US1] Update `src/pages/course/CourseHome.tsx`: use `useSectionLock`; render locked cards as non-button elements with `<LockIcon />` overlay + tooltip "Complete {prereqTitle} first"; keep keyboard focus on the card for screen-reader announcement; remove the auto-resume-redirect when *any* section is locked beyond what the participant can reach.
- [ ] T029 [US1] Manual verification per `quickstart.md` §2 (10-step walkthrough); attach a short screen-capture or notes to the PR. **Performance spot-check (resolves analysis A12)**: while running the walkthrough, open Chrome DevTools → Performance, record a slide transition, and verify the transition frame budget stays ≥ 60 fps (no frames > 16 ms). Note any dropped frames in the PR description.

**Checkpoint**: US1 functional — MVP is shippable here.

---

## Phase 4: User Story 2 — Structured Multi-Question Text Exercises (Priority: P2)

**Goal**: Past Experience Inventory renders as 14 labelled textareas; Contract With Myself as 6 articles; Mission Statement as 5 dimensions. Each sub-question is required before the slide advances.

**Independent test**: A participant opens Past Experience Inventory, sees 14 separate fields, fills 13 and confirms the next arrow stays disabled; fills the 14th, confirms the next arrow enables; saves and reloads to confirm persistence.

### Tests for User Story 2 ⚠️

- [X] T030 [P] [US2] Write failing test `src/components/exercise/StructuredTextExercise.test.tsx` covering: renders N labelled textareas; min_length gating per question; saving creates `{answers: {q1: …, q2: …}}` JSON; legacy banner appears when `_legacy` is present in initialResponse.
- [X] T031 [P] [US2] Write failing test additions in `src/lib/exerciseCompletion.test.ts` for `isStructuredTextComplete` per data-model.md §5 completion predicate.

### Implementation for User Story 2

- [X] T032 [P] [US2] Implement `src/components/exercise/StructuredTextExercise.tsx` + `StructuredTextExercise.module.css` per `contracts/exercise-types.md` §1 (controlled inputs per question, autosave via `useExerciseSave`, `_legacy` banner UI).
- [X] T033 [US2] Add a `case 'structured-text'` branch to the `renderExercise` switch in `src/pages/course/SectionPage.tsx`; wire `StructuredTextExercise` with `commonProps`.
- [X] T034 [US2] Rewrite three entries in `db/seeds/course-content.json`: `past-experience-inventory` (type → `structured-text`; 14 questions q1–q14 with labels from the current prompt); `contract-with-myself` (article_1 … article_6); `mission-statement` (5 dimensions). Preserve original `prompt` text as framing. Re-run `npm run seed`.
- [ ] T035 [US2] Manual verification per `quickstart.md` §6. For an existing test profile with an old free-text response, confirm the `_legacy` banner displays.

**Checkpoint**: US2 functional.

---

## Phase 5: User Story 3 — WATUSI Auto-Count + Linked Slide-Group (Priority: P2)

**Goal**: The Attitudes checklist and the six-attitude ranking render on a single slide. Count badges per WATUSI group update live below the ranking based on the checklist response. Counts are read-only; the ranking is pre-derived from counts but still draggable.

**Independent test**: A participant ticks 7 W-items and 3 S-items on the checklist; the ranking on the same slide reorders so W is first with count "7", S is second with count "3"; clicking on a count badge does nothing; the saved ranking is whatever the participant confirms on the slide.

### Tests for User Story 3 ⚠️

- [X] T036 [P] [US3] Write failing test `src/hooks/useWatusiCounts.test.ts` covering: empty checklist → all zeros; mixed prefix counting; tie-breaking by canonical WATUSI order; ignoring malformed item ids.
- [X] T037 [P] [US3] Extend `src/components/exercise/RankingExercise.test.tsx` for the `show_counts` + `derives_from` branch: count badges render beneath items; badge clicks are inert; prefilled order matches derived counts; manual reorder still persists.

### Implementation for User Story 3

- [X] T038 [P] [US3] Implement `src/hooks/useWatusiCounts.ts` (pure function of a checklist response, returns `{ w, a, t, u, s, i }`; tie-break order constant per research.md R4).
- [X] T039 [US3] Extend `src/components/exercise/RankingExercise.tsx`: when `content.show_counts === true` and `content.derives_from` is set, query the upstream exercise's response (via prop drilling from SectionPage; do NOT fetch from inside RankingExercise) and render read-only count badges; auto-fill the initial `order` from derived counts when no saved response exists yet.
- [X] T040 [US3] Update `src/pages/course/SectionPage.tsx` to: (a) compute `slideGroups` by `slide_group` (falling back to `order_index`); (b) for each group, render its exercises inside a single slide container with shared completion check (all exercises in group must be `is_complete`); (c) when a ranking exercise has `derives_from`, pass the upstream exercise's response in as `derivesFromResponse` prop.
- [X] T041 [US3] Update `db/seeds/course-content.json`: set `slide_group = 3` on both `attitude-types-checklist` and `attitude-types-watusi`; add `show_counts: true` and `derives_from: { source_exercise_slug: 'attitude-types-checklist', group_by: 'id_prefix' }` to `attitude-types-watusi.content_json`. Re-run `npm run seed`.
- [ ] T042 [US3] Manual verification per `quickstart.md` §3.

**Checkpoint**: US3 functional.

---

## Phase 6: User Story 4 — Values Shopping Spree Widget + Gated Proceed (Priority: P2)

**Goal**: The Shopping Spree table surfaces a floating Spent/Remaining widget that updates as the participant types. The follow-on "What Do I Value?" slide's Proceed button is only enabled when total spent equals exactly $100,000.

**Independent test**: A participant enters amounts totalling $100,000 across rows; the widget shows "Perfect" state and the Proceed button on the next slide is enabled. Editing back to $99,999 disables Proceed again.

### Tests for User Story 4 ⚠️

- [X] T043 [P] [US4] Write failing test `src/hooks/useValuesTotal.test.ts` covering: sums numeric values, ignores non-numeric, handles empty rows, handles decimal inputs.
- [X] T044 [P] [US4] Write failing test `src/components/exercise/ValueBudgetWidget.test.tsx` covering: renders Spent/Remaining; "Perfect" state at exactly target; "Over budget" recolour when remaining is negative.
- [X] T045 [P] [US4] Extend `src/components/exercise/TableExercise.test.tsx`: with `col_types: ['currency','text']` + `total_target: 100000`, the widget renders and `response.total_spent` is computed on save.

### Implementation for User Story 4

- [X] T046 [P] [US4] Implement `src/hooks/useValuesTotal.ts`.
- [X] T047 [P] [US4] Implement `src/components/exercise/ValueBudgetWidget.tsx` + `ValueBudgetWidget.module.css`. Position: fixed bottom-right on desktop, full-width sticky bottom on mobile.
- [X] T048 [US4] Extend `src/components/exercise/TableExercise.tsx`: detect `content.col_types` includes `'currency'`; render `ValueBudgetWidget` with `budget = content.total_target ?? 0` and `spent = total`; persist `total_spent` alongside rows when saving.
- [X] T049 [US4] Add a Proceed-gate to the follow-on slide. The simplest path: in `SectionPage.tsx`, when computing `canGoNext` for a slide group, if any exercise in the group has a `total_target` and its response's `total_spent !== total_target`, return false with hint "Total must equal $100,000 to continue". The follow-on slide ("What Do I Value?") is the next slide group after the Shopping Spree, so its render also reads the prior response and shows a helper message. (See `quickstart.md` §4.)
- [X] T050 [US4] Update `db/seeds/course-content.json`: `values-shopping-spree.content_json.col_types = ['currency','text']`, `total_target = 100000`. Re-run `npm run seed`.
- [ ] T051 [US4] Manual verification per `quickstart.md` §4.

**Checkpoint**: US4 functional.

---

## Phase 7: User Story 5 — Testimonials (Priority: P2)

**Goal**: At course completion, a participant can submit one testimonial per session. Facilitators see testimonials from their own sessions; admins see all. RLS blocks cross-facilitator leakage.

**Independent test**: A participant submits a testimonial; the same participant's facilitator sees it on `/facilitator/testimonials`; a different facilitator does not; admin sees it on `/admin/testimonials` with the originating facilitator's name shown.

### Tests for User Story 5 ⚠️

- [X] T052 [P] [US5] Write failing test `src/components/testimonials/TestimonialModal.test.tsx`: 50/1500 char enforcement, optional rating 1–5, submit triggers upsert with correct payload.
- [X] T053 [P] [US5] Write failing test `src/components/testimonials/TestimonialList.test.tsx`: renders rows, empty state, row click expands content.
- [X] T054 [P] [US5] Write failing integration test `scripts/testimonials.test.ts` exercising the RLS matrix in `contracts/testimonials-api.md` §6 against the hosted DB. Follow the auto-skip pattern from `scripts/rpc.test.ts` (skip when `VITE_SUPABASE_URL` or `SUPABASE_SECRET_KEY` is unset).

### Implementation for User Story 5

- [X] T055 [P] [US5] Implement `src/components/testimonials/TestimonialModal.tsx` + CSS. Resolves `session_id` from the participant's most recent active enrollment per `contracts/testimonials-api.md` §2. On submit calls `supabase.from('testimonials').upsert(..., { onConflict: 'participant_id,session_id' })`.
- [X] T056 [P] [US5] Implement `src/components/testimonials/TestimonialList.tsx` + CSS. Generic list usable by both admin and facilitator pages; accepts a `query` prop for the supabase-js select chain.
- [X] T057 [US5] Implement `src/pages/course/CourseClosing.tsx`. Shown when every section's `section_completed_at` is non-null. Shows summary + attribution + primary "Leave a testimonial" button that opens `TestimonialModal`.
- [X] T058 [US5] Add route `/course/complete → <CourseClosing />` in `src/App.tsx` under the participant auth guard.
- [X] T059 [P] [US5] Implement `src/pages/admin/TestimonialsPage.tsx`. **MUST be loaded via `React.lazy(() => import(...))`** at the App.tsx route registration site so the file ships as a separate Vite chunk (verified by inspecting `dist/assets/` after `npm run build` for a dedicated `TestimonialsPage-*.js` chunk). Renders `TestimonialList` with the admin query from `contracts/testimonials-api.md` §5. Add to admin Sidebar.
- [X] T060 [P] [US5] Implement `src/pages/facilitator/TestimonialsPage.tsx`. **MUST be `React.lazy`-loaded** (same chunking expectation as T059). Renders `TestimonialList` with the facilitator query from `contracts/testimonials-api.md` §4. Add to facilitator Sidebar.
- [X] T061 [US5] Update `src/components/layout/Sidebar.tsx` (or admin/facilitator-specific variant) to include a "Testimonials" entry pointing at the right route per role; guard via the existing role check.
- [X] T062 [US5] Update `src/App.tsx` routing: add `/admin/testimonials` and `/facilitator/testimonials` lazy-loaded routes under the existing role guards.
- [ ] T063 [US5] Manual verification per `quickstart.md` §9 (8-step cross-role walkthrough).

**Checkpoint**: US5 functional.

---

## Phase 8: User Story 6 — Drag-and-Drop Ranking (Priority: P3)

**Goal**: Roles ranking exercises use drag-and-drop (mouse, touch, keyboard) instead of up/down buttons.

**Independent test**: A participant in Roles uses (a) mouse drag, (b) touch drag (on a tablet/emulator), and (c) keyboard (Tab → Space-grab → Up/Down → Space-drop) to reorder items, and the reorder persists across reload.

### Tests for User Story 6 ⚠️

- [X] T064 [P] [US6] Extend `src/components/exercise/RankingExercise.test.tsx` with an `interaction: 'drag'` branch: assert up/down buttons are NOT rendered; assert `DndContext`/`SortableContext` are in the tree; simulate keyboard reorder via `@testing-library/user-event` and verify saved `order` reflects the change.

### Implementation for User Story 6

- [X] T065 [US6] Extend `src/components/exercise/RankingExercise.tsx` with an `interaction: 'drag'` branch using `@dnd-kit/core` + `@dnd-kit/sortable`. Compose `KeyboardSensor`, `PointerSensor`, `TouchSensor`. On drop, call `save({ order: nextOrder }, true)`. Preserve the existing `'buttons'` branch unchanged for default callers.
- [X] T066 [US6] Update `db/seeds/course-content.json`: every ranking-type exercise in the Roles section (`roles`) sets `interaction: 'drag'`. Re-run `npm run seed`.
- [ ] T067 [US6] Manual verification per `quickstart.md` §5.

**Checkpoint**: US6 functional.

---

## Phase 9: User Story 7 — Rating-Picker Exercise (Transferable Skills) (Priority: P3)

**Goal**: The "Determining My Transferable Skills" exercise displays each skill with a 1–5 radio group instead of free text / table cells.

**Independent test**: A participant rates every skill 1–5; the exercise marks complete only when every skill has a rating; saved response shape matches `{ ratings: { [skillId]: number } }`.

### Tests for User Story 7 ⚠️

- [X] T068 [P] [US7] Write failing test `src/components/exercise/RatingPickerExercise.test.tsx`: renders N rows × 5 radios; only one selection per item; "complete" only when every item is rated.
- [X] T069 [P] [US7] Extend `src/lib/exerciseCompletion.test.ts` for `isRatingPickerComplete` per data-model.md §6.

### Implementation for User Story 7

- [X] T070 [P] [US7] Implement `src/components/exercise/RatingPickerExercise.tsx` + CSS. Render a `<fieldset>` per item; five `<input type="radio">` per fieldset; labels from `content.scale.labels` when provided; persistence via `useExerciseSave`.
- [X] T071 [US7] Add `case 'rating-picker'` to the `renderExercise` switch in `src/pages/course/SectionPage.tsx`.
- [X] T072 [US7] Update `db/seeds/course-content.json`: rewrite `determining-transferable-skills` to type `'rating-picker'`; populate `items` from the workbook skill list; set `scale: { min: 1, max: 5, labels: ['Strongly Disagree','Disagree','Neutral','Agree','Strongly Agree'] }`. Re-run `npm run seed`.
- [ ] T073 [US7] Manual verification per `quickstart.md` §7.

**Checkpoint**: US7 functional.

---

## Phase 10: User Story 8 — Goal Setting Pattern Application (Priority: P3)

**Goal**: Apply the new exercise types where they fit existing Goal Setting exercises. No new component types.

**Independent test**: Walk through every exercise in the Setting Goals section; confirm each multi-question prompt is now a structured-text exercise and each rating-style exercise is now a rating-picker.

- [X] T074 [P] [US8] Audit `db/seeds/course-content.json` entries under the `goal-setting` section; in `specs/003-slide-nav-ux-rework/goal-setting-audit.md`, list each exercise with the current type and the proposed new type (or "no change"). Justify each decision in one line.
- [X] T075 [US8] Update `db/seeds/course-content.json` per the audit: rewrite eligible Goal Setting exercises to `structured-text` or `rating-picker`. Cross-Impact Matrix MUST remain `table`. Re-run `npm run seed`.
- [ ] T076 [US8] Manual verification per `quickstart.md` §8.

**Checkpoint**: US8 functional. Feature complete.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Verification, hardening, and post-implementation Constitution re-check.

- [X] T077 [P] Bundle delta verification: `npm run build && du -sh dist/assets/*.js.gz | sort -h | tee /tmp/bundle-after.txt`; diff against the baseline captured in T003. Confirm participant route delta ≤ 15 KB gz. Lazy-loaded admin chunks may be larger. Record results in `specs/003-slide-nav-ux-rework/bundle-delta.md`.
- [X] T078 [P] Run full vitest suite: `npm test -- --run`. Confirm all existing tests + every new test green, no regressions vs. iteration 2's `84/84 passing` baseline (plus the new tests).
- [ ] T079 [P] Update `specs/003-slide-nav-ux-rework/quickstart.md` with any rough edges discovered during implementation (real screenshots, exact CLI quirks, etc.).
- [X] T080 [P] Run `npm run audit:security`; review `security-audit.md` output. No new advisor findings should appear (testimonials policies should be lint-clean; structured-text/rating-picker are JSONB-only additions).
- [X] T081 [P] Run `npm run check:no-bypass` (existing script extended in iteration 2). Confirm no dev sentinels in `dist/`.
- [X] T082 **Verify** (post-build) that `TestimonialsPage` files emerged as separate Vite chunks (admin + facilitator each in their own `dist/assets/*.js` file). The lazy-loading itself is required *during* US5 implementation (T059/T060); this task is the verification gate that those imports actually produced separate chunks.
- [X] T083 Constitution post-implementation check: re-evaluate the five gates in plan.md's "Constitution Check (post-Phase-1 re-evaluation)" section against the final implementation. Update plan.md with the outcome.
- [X] T084 Resolve the three Open Questions in `spec.md`: Q1 (reading material IP review — closed by T011), Q2 (multi-session testimonial → resolved to most-recent enrollment at submission time, see T055), Q3 (legacy free-text handling — confirmed `_legacy` banner approach in T032). Record final answers at the bottom of `spec.md`.
- [ ] T085 [P] **Accessibility audit (resolves analysis A5)**: install `@axe-core/react` as a dev dependency (or run `axe-core` against the running dev server via the Playwright skill); execute against `/course`, `/course/personality`, `/course/personality` with the WATUSI slide active, `/course/values` with the Shopping Spree slide active, `/course/roles` with the drag-and-drop slide active, `/course/complete`, `/admin/testimonials`, `/facilitator/testimonials`. Capture findings in `specs/003-slide-nav-ux-rework/a11y-audit.md`. Resolve any violation at WCAG 2.1 AA before merging. Manually verify keyboard-only navigation: drag-and-drop via keyboard (Tab → Space → Up/Down → Space) and slide nav via Tab/Enter.
- [X] T086 [P] **CI performance gate scoping (resolves analysis A6 — deferral)**: confirm Iteration 5 spec stub exists (or create `specs/004-perf-ci-gate/spec.md` skeleton) capturing the requirement to stand up Lighthouse-CI per Constitution §IV. This task is administrative — it records the deferral decision documented in plan.md's Complexity Tracking so it is not lost. No code change in this iteration.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1; **BLOCKS** all user stories.
- **US1 (Phase 3 — P1, MVP)**: Depends on Phase 2; no story dependencies.
- **US2 / US3 / US4 / US5 (Phases 4–7 — P2)**: All depend on Phase 2. US3 (slide-group rendering) builds on US1's SectionPage refactor — sequence US1 → US3 if a single developer. US2 / US4 / US5 are otherwise independent.
- **US6 / US7 / US8 (Phases 8–10 — P3)**: Depend on Phase 2. US6 (drag-and-drop) builds on US1's slide nav. US7 is independent. US8 reuses US2 + US7 patterns — sequence US2 + US7 → US8.
- **Polish (Phase 11)**: Depends on every shipping user story being complete.

### Critical task dependencies

- T011 (IP review) **blocks** T026 (reading_material seeding).
- T004–T009 (foundational DB + types) **block** every implementation task.
- T027 (SectionPage slide refactor) is the central integration point for US1; US3's T040 extends it; US7's T071 adds a case to its switch; US2's T033 adds another case. Avoid simultaneous edits by serialising those four touches.
- T028 (CourseHome locking) depends on T020 (useSectionLock).

### Within each user story

- All `[RED]` test tasks MUST be written and confirmed failing BEFORE any implementation task in that story is started (Constitution §II).
- Hooks before components (e.g., T019/T020 before T022/T028).
- Component implementations before they are wired into pages.

### Parallel opportunities

- **Setup (Phase 1)**: T003 is `[P]`; T001 + T002 are sequential (branch then deps).
- **Foundational (Phase 2)**: T010 and T011 are `[P]` (different files); the migration sequence T004→T005→T006→T007→T008→T009 must run in order.
- **Across stories after Phase 2**:
  - One developer can work US1 while another works US5 (testimonials touches none of US1's files).
  - US3 must wait for US1's T027.
- **Within US1**: T013–T018 are all `[P]` (different files); T019–T021 are `[P]`; T022/T023/T024 are sequential as they wire each other.
- **Within US4**: T043–T045 are `[P]`; T046/T047 are `[P]`.
- **Within US5**: T052–T054 are `[P]`; T055/T056/T059/T060 are `[P]`.

---

## Parallel Example: User Story 1

```bash
# Launch all US1 test tasks together (they touch different files):
Task: "Write failing test src/components/section/SlideNav.test.tsx"               # T013
Task: "Write failing test src/hooks/useSlideState.test.ts"                         # T014
Task: "Write failing test src/hooks/useSectionLock.test.ts"                        # T015
Task: "Write failing test src/components/section/SectionIntroSlide.test.tsx"      # T016

# Once tests are RED, launch hook + icon implementations together:
Task: "Implement src/hooks/useSlideState.ts"                                       # T019
Task: "Implement src/hooks/useSectionLock.ts"                                      # T020
Task: "Implement src/components/ui/LockIcon.tsx"                                   # T021
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational). Foundational must include T010 and T011 (IP review).
2. Complete Phase 3 (US1). **STOP and VALIDATE**: a brand-new participant can complete one section and unlock the next.
3. Demo / ship as MVP. The exercise UX (textareas, table, ranking buttons) remains as-is at this point — only the pacing has changed.

### Incremental Delivery

- **Sprint 1**: Setup + Foundational + US1 → ship.
- **Sprint 2**: US2 + US3 → ship.
- **Sprint 3**: US4 + US5 → ship.
- **Sprint 4**: US6 + US7 + US8 + Polish → ship.

Each sprint produces an independently testable, releasable increment.

### Parallel Team Strategy

With 3+ developers, after Phase 2 completes:

- Dev A: US1 (P1, MVP) — owns the core slide refactor.
- Dev B: US5 (testimonials — DB + dashboards) — independent.
- Dev C: US2 (structured-text) — independent.
Then after US1 lands:
- Dev A: US3 (depends on US1's slide-group plumbing).
- Dev B: US6 (drag-and-drop; depends on US1's slide nav).
- Dev C: US4 / US7 / US8 in priority order.

---

## Notes

- `[P]` tasks operate on different files and have no incomplete dependencies.
- Every `[RED]` test task must fail before its paired implementation begins (Constitution §II).
- IP review (T011) is a Constitution gate — do not seed `reading_material` content without sign-off.
- All migrations are additive; no destructive DDL. Existing data is preserved with the `_legacy` JSON key approach (T032).
- Commit cadence: one commit per task or one commit per logically grouped set; never leave the working tree dirty across a checkpoint.
- Stop and validate at each phase checkpoint; do not proceed to the next phase if the current story's independent test does not pass.
