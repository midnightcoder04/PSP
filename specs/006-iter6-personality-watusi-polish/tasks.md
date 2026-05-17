# Tasks: Iter6 — Personality Deep-Dive, WATUSI Sorted Listing, Power-Points Formatting

**Feature**: `006-iter6-personality-watusi-polish`
**Branch**: `006-iter6-personality-watusi-polish`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Conventions

- `[P]` — Parallelizable with other `[P]` tasks in the same phase (different files, no shared mutable state).
- `[USn]` — Belongs to User Story n. Setup/Foundational/Polish tasks have no story label.
- Per Constitution §II, every `[USn]` implementation task has a corresponding RED test task that MUST be written + run failing first.
- "TTI attribution string" = `(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)`.

---

## Phase 1: Setup

- [X] T001 Verify branch is `006-iter6-personality-watusi-polish` and working tree is clean (run `git status` + `git rev-parse --abbrev-ref HEAD`)
- [X] T002 Confirm no new npm dependencies required (existing `@dnd-kit/*`, Vitest, RTL suffice); record `package.json` hash in a scratch comment for diff-check after Phase 7
- [X] T003 [P] Scaffold `scripts/build-migration-016.ts` as a copy of `scripts/build-migration-015.ts`, renaming the constants and the output paths (`db/migrations/016_personality_deep_dive.sql` + `supabase/migrations/20260518000000_016_personality_deep_dive.sql`)

---

## Phase 2: Foundational (BLOCKING — must complete before any user-story phase)

**Purpose**: Shared infrastructure used by US1, US3, US4. Cannot be skipped.

- [X] T004 Write RED test suite for the shared block-aware parser in `src/lib/markdownBlocks.test.ts` covering cases TX1–TX8 from `contracts/text-prompt-parser.md` (numbered, bulleted, paragraph, mixed, empty, single-line, multi-bullet-style, Power-Points fixture)
- [X] T005 Extract `parseBlocks` (and the `Block` type + regex constants `NUMBERED`/`BULLET`) from `src/components/exercise/InfoExercise.tsx` into a new module at `src/lib/markdownBlocks.ts`; export `parseBlocks`, `Block`, `NUMBERED`, `BULLET`
- [X] T006 Refactor `src/components/exercise/InfoExercise.tsx` to import `parseBlocks` from `@/lib/markdownBlocks` instead of defining it inline; verify no behaviour change by running the existing `InfoExercise` tests (must stay GREEN)
- [X] T007 [P] Extend `src/types/database.ts`: add the `'sorted'` literal to the `RankingContent['interaction']` union; add `CoreStyleSectionContent` and `CoreStyleChecklistContent` shapes from `data-model.md`
- [X] T008 [P] Update `scripts/validate-seed.ts` to validate the new shapes: `sections_by_style` must have all 4 keys (D/I/S/C) with non-empty string values; `options_by_style` must have all 4 keys with arrays of ≥ 3 options; `interaction: 'sorted'` requires `derives_from` to also be set
- [X] T009 Confirm Phase 2 GREEN: run `pnpm vitest run src/lib/markdownBlocks.test.ts src/components/exercise/InfoExercise.test.tsx` and `pnpm tsx scripts/validate-seed.ts` — all GREEN before any user-story phase begins

**Checkpoint**: After Phase 2, the shared parser is live, types support the new shapes, and the seed validator enforces the new invariants. US1 / US3 / US4 may now proceed in parallel.

---

## Phase 3: US1 — WATUSI ranking becomes a read-only sorted listing (P1)

**Story goal**: When the participant clicks Next from the Identifying-Your-Attitudes checklist, the WATUSI ranking slide auto-renders sorted by counts (W/A/T/U/S/I tiebreak, highest first), with no drag/buttons, no `#` rank column, and the slide-gate advances without manual interaction.

**Independent test**: Tick known counts on the checklist → click Next → WATUSI slide shows rows in the expected sorted order with no drag handles and no `#` column → click Next → slide advances.

### Tests (RED first)

- [X] T010 [US1] Add RED test to `src/components/exercise/RankingExercise.test.tsx`: "T1 — interaction='sorted' with no initialResponse calls save once with {order: derivedOrder} and is_complete=true" (mock `useExerciseSave` and assert the call shape)
- [X] T011 [P] [US1] Add RED test "T6 — interaction='sorted' renders no `.rank` element and no drag-handle element" to `src/components/exercise/RankingExercise.test.tsx`
- [X] T012 [P] [US1] Add RED test "T3 — interaction='sorted' re-derives order when derivesFromResponse changes" to `src/components/exercise/RankingExercise.test.tsx`
- [X] T013 [P] [US1] Add RED test "T2 — interaction='sorted' with initialResponse already present does NOT call save" to `src/components/exercise/RankingExercise.test.tsx`
- [X] T014 [P] [US1] Add RED test "T4 — interaction='sorted' with readOnly=true suppresses auto-complete-on-mount" to `src/components/exercise/RankingExercise.test.tsx`

### Implementation

- [X] T015 [US1] In `src/components/exercise/RankingExercise.tsx`, add an early-return branch for `interaction === 'sorted'`: render a static `<ol role="list">` of rows where each row is `<li role="listitem" aria-label="{label}, count {count}">{label}<span className={styles.countBadge}>{count}</span></li>`. No `<SortableContext>`, no drag handles, no up/down buttons, no `.rank` cell.
- [X] T016 [US1] In `src/components/exercise/RankingExercise.tsx`, add a `useEffect` (with a `useRef` guard for StrictMode double-invoke) that, when `interaction === 'sorted'` AND `initialResponse == null` AND `!readOnly`, calls `save({ order: derived.order }, true)` exactly once
- [X] T017 [US1] In `src/components/exercise/RankingExercise.module.css`, pin `.countBadge` with `margin-left: auto`, `position: static`, `flex-shrink: 0`; slim its `padding` to `2px 8px`; ensure the sorted-mode `<li>` uses `display: flex; align-items: center; gap: var(--space-3)`
- [X] T018 [US1] Confirm US1 tests GREEN: `pnpm vitest run src/components/exercise/RankingExercise.test.tsx`

**US1 checkpoint**: WATUSI ranking renders read-only, auto-completes, and tests pass.

---

## Phase 4: US2 — Count badge no longer overlaps Next button (P1)

**Story goal**: The sticky `SlideNav` Next button stays fully visible on any viewport ≥ 320 px wide, even when the WATUSI ranking row's count badge would otherwise overlap it.

**Independent test**: Render WATUSI slide at 375×667 → scroll to bottom → Next button fully visible + clickable. Count chip has `position: static` per computed style.

### Tests (RED first)

- [X] T020 [US2] Add RED test "T5 — count chip computed style is position:static (not absolute)" to `src/components/exercise/RankingExercise.test.tsx` using `window.getComputedStyle`

### Implementation

- [X] T021 [US2] In `src/pages/course/SectionPage.module.css`, add `padding-bottom: var(--space-12)` to `.slideTrack` so the last slide's content can scroll clear of the sticky `SlideNav`
- [X] T022 [US2] Verify (via dev-tools inspection during US1 T018) that the count chip CSS from T017 already satisfies T020; if not, adjust `RankingExercise.module.css` to enforce `position: static`
- [X] T023 [US2] Confirm US2 test GREEN: `pnpm vitest run src/components/exercise/RankingExercise.test.tsx -t "position:static"`

**US2 checkpoint**: Floating-badge defect resolved.

---

## Phase 5: US3 — Personality matched-style deep-dive (P2)

**Story goal**: After the four-profile read-through, the participant sees four additional slides containing ONLY their matched core style's content (Characteristics, Ideal Environment, optional Traits Checklist, Comfort Zones). `my-core-style` text exercise is removed.

**Independent test**: Take quiz → Extrovert + Task → HIGH D. After the four read-throughs, see 4 HIGH-D-only slides (verify HIGH-I/S/C content absent from DOM). Tick a few traits → reload → ticks persist. Section ends without "My Core Style".

### Tests (RED first — component-level)

- [X] T030 [US3] Create `src/lib/coreStyle.test.ts` additions (or new file `src/lib/coreStyleDeepDive.test.ts`) with RED tests for a `pickStyleBlock(content, q1Resp, q2Resp)` helper: returns the right `sections_by_style` block for each {E/I × P/T} → {D/I/S/C} permutation, returns null/undefined when either response is missing
- [X] T031 [P] [US3] Add RED test "P1 — info exercise with computed='core_style_section' renders sections_by_style[D] when quiz resolves to D" to `src/components/exercise/CoreStyleInfo.test.tsx` (new file). Verify HIGH-I/S/C content is NOT in the DOM via `queryByText` with the I/S/C marker substrings
- [X] T032 [P] [US3] Add RED test "P3 — info exercise with computed='core_style_section' renders fallback content when quiz answers missing" to `src/components/exercise/CoreStyleInfo.test.tsx`
- [X] T033 [P] [US3] Add RED tests to `src/components/exercise/CoreStyleChecklist.test.tsx` (new file): (a) "P2 — checkbox exercise with `computed='core_style_options'` renders `options_by_style[I]` when quiz resolves to I and persists ticks"; (b) "P3-checklist — when either quiz response is missing, the checklist renders the fallback prompt and NO `<input type='checkbox'>` elements are in the DOM" (mirrors T032's info-fallback test for the checklist branch)
- [X] T034 [P] [US3] Add RED SQL test `db/tests/016_deep_dive_exercises_invariants.sql` asserting: the four new exercise rows exist with correct slugs (`core-style-characteristics`, `core-style-ideal-environment`, `core-style-traits-checklist`, `core-style-comfort-zones`), correct `slide_group` (7/8/9/10), correct `order_index` (9/10/11/12), and each row's `attribution` exactly equals the TTI attribution string — asserted PER SLUG, not as an aggregate. Additionally assert `my-core-style.slide_group = NULL AND order_index = 99`; `attitude-types-watusi.content_json->>'interaction' = 'sorted'`.
- [X] T035 [P] [US3] Add RED SQL test `db/tests/016_idempotency.sql` that runs the migration twice and re-asserts T034 invariants

### Library helper

- [X] T036 [US3] In `src/lib/coreStyle.ts`, add `pickStyleBlock<T>(blocks: Record<'D'|'I'|'S'|'C', T>, q1Resp: Response|undefined, q2Resp: Response|undefined): T | null`. Use the existing `resolveCoreStyleFromResponses` to compute the style key; return `blocks[result]` or `null`.

### Components

- [X] T037 [US3] Create `src/components/exercise/CoreStyleInfo.tsx` exporting a component that receives `{ content: CoreStyleSectionContent, q1Response, q2Response, exerciseId, participantId, sessionId, readOnly }`. Resolve via `pickStyleBlock`. If non-null → render via `parseBlocks` (from `@/lib/markdownBlocks`) as `<ol>/<ul>/<p>` blocks. If null → render `content.content` (fallback) wrapped in `<div className={styles.fallback}>`.
- [X] T038 [US3] Create `src/components/exercise/CoreStyleInfo.module.css` with `.fallback` style (muted text, slight border-left). Reuse `InfoExercise.module.css` patterns where applicable.
- [X] T039 [US3] Create `src/components/exercise/CoreStyleChecklist.tsx` exporting a component that receives `{ content: CoreStyleChecklistContent, q1Response, q2Response, exerciseId, participantId, sessionId, readOnly, initialResponse }`. Resolve via `pickStyleBlock(content.options_by_style, ...)`. If non-null → render `<CheckboxExercise content={{ prompt, options: picked, allow_multiple: true }} initialResponse=… />`. If null → render fallback prompt directing back to quiz.
- [X] T040 [US3] In `src/pages/course/SectionPage.tsx`, extend the `info` render branch: when `content.computed === 'core_style_section'`, resolve the two quiz responses by id (from `content.computed_inputs`) and render `<CoreStyleInfo .../>` instead of `<InfoExercise .../>`. Pass through `q1Response` and `q2Response` props.
- [X] T041 [US3] In `src/pages/course/SectionPage.tsx`, extend the `checkbox` render branch: when `content.computed === 'core_style_options'`, resolve the two quiz responses and render `<CoreStyleChecklist .../>` instead of `<CheckboxExercise .../>`.
- [X] T042a [US3] Add a RED unit test to `src/hooks/useSlideState.test.ts` asserting that `groupComplete` treats a checkbox exercise as complete when its `content_json.computed === 'core_style_options'` (regardless of whether a response exists), AND that any OTHER checkbox (with or without `is_scored=false`) still requires `responses[ex.id]?.is_complete === true`. (Per U1 in /speckit-analyze: rule scoped narrowly to the `core_style_options` dispatcher exercise.)
- [X] T042b [US3] In `src/hooks/useSlideState.ts` (extend `groupComplete` at line 31), add the narrow rule: a checkbox exercise whose `content_json.computed === 'core_style_options'` is treated as always-complete for slide-gate purposes. All other checkboxes retain the standard gating contract. Confirm T042a flips to GREEN.

### Seed content

- [X] T043 [US3] In `db/seeds/course-content.json`, add the four new Personality exercise rows: `core-style-characteristics` (info, slide_group=7, order_index=9), `core-style-ideal-environment` (info, slide_group=8, order_index=10), `core-style-traits-checklist` (checkbox, slide_group=9, order_index=11, `is_scored: false`), `core-style-comfort-zones` (info, slide_group=10, order_index=12). All carry TTI attribution.
- [X] T044 [US3] In each of the four new rows' `content_json`, populate `sections_by_style` / `options_by_style` with content sourced VERBATIM from `psp_content.md` lines 468–620 (HIGH D §468–506, HIGH I §509–547, HIGH S §550–588, HIGH C §592–onwards). Strip `☐` Unicode marks from prose but preserve them inside checklist option labels where they're semantic.
- [X] T045 [US3] In `db/seeds/course-content.json`, set the existing `my-core-style` row's `slide_group: null` and `order_index: 99`. Do NOT delete the row.
- [X] T046 [US1, US3] In `db/seeds/course-content.json`, change the existing `attitude-types-watusi` row's `content_json.interaction` from `"drag"` to `"sorted"`. (Bundled into Phase 5 alongside the four new Personality rows to keep all `course-content.json` edits in one logical batch; the US1 manual quickstart depends on this seed change.)
- [X] T047 [US3] Run `pnpm tsx scripts/validate-seed.ts` — must report 9 sections, 39 exercises, clean (no warnings, no errors).

### Migration

- [X] T048 [US3] Implement `scripts/build-migration-016.ts` to emit the migration per `contracts/migration-016.md` §Operations: (1) DELETE responses for the 4 new exercises; (2) DELETE the 4 new exercise rows by slug; (3) UPSERT the 4 new rows with seed-provided content; (4) UPDATE `my-core-style` to soft-hide; (5) UPDATE `attitude-types-watusi.content_json.interaction = 'sorted'`. Use dollar-quoted JSONB literals (`$json$ ... $json$::jsonb`).
- [X] T049 [US3] Run `pnpm tsx scripts/build-migration-016.ts` — verify `db/migrations/016_personality_deep_dive.sql` and `supabase/migrations/20260518000000_016_personality_deep_dive.sql` are generated and identical
- [ ] T050 [US3] Apply migration 016 to local Supabase (`supabase db reset` or direct psql); verify `db/tests/016_deep_dive_exercises_invariants.sql` and `db/tests/016_idempotency.sql` pass against the local DB

### Wire-up + verification

- [X] T051 [US3] Confirm all US3 Vitest tests GREEN: `pnpm vitest run src/lib/coreStyle.test.ts src/components/exercise/CoreStyleInfo.test.tsx src/components/exercise/CoreStyleChecklist.test.tsx src/lib/exerciseCompletion.test.ts`
- [ ] T052 [US3] Manual smoke per `quickstart.md` §3 Path A (E+T→D): take quiz, advance past read-throughs, verify slides 7–10 show HIGH-D-only content, tick traits, navigate away + back, ticks persist, section closes without `my-core-style`

**US3 checkpoint**: Personality deep-dive feature complete, four matched-style slides functional, `my-core-style` invisible.

---

## Phase 6: US4 — TextExercise prompt parser (P3)

**Story goal**: `TextExercise` prompts with numbered/bulleted lines render as `<ol>`/`<ul>` blocks (matching `InfoExercise`'s behaviour), so the Power-Points reflection's six points read as a vertical list.

**Independent test**: Open the Attitudes section → advance to Power-Points slide → the six numbered points render as separate `<li>` elements, not one paragraph.

### Tests (RED first)

- [X] T060 [US4] Add RED tests to `src/components/exercise/TextExercise.test.tsx`: (a) prompt with numbered lines renders as `<ol>` with one `<li>` per item; (b) prompt with bullet lines renders as `<ul>`; (c) prompt with mixed prose + numbered list renders the prose as `<p>` and the list as `<ol>`; (d) prompt without lists renders unchanged as `<p>` (regression guard)

### Implementation

- [X] T061 [US4] In `src/components/exercise/TextExercise.tsx`, replace the existing `<p className={styles.prompt}>{content.prompt}</p>` with a render-loop over `parseBlocks(content.prompt)` from `@/lib/markdownBlocks`, mirroring `InfoExercise.tsx`. Reuse the same DOM element classes (`.prompt` wraps; `.numberedList` / `.bulletList` for lists).
- [X] T062 [US4] In `src/components/exercise/TextExercise.module.css`, add `.numberedList` and `.bulletList` styles mirroring `InfoExercise.module.css` (column resets defensive; semantic list spacing)
- [X] T063 [US4] Confirm US4 tests GREEN: `pnpm vitest run src/components/exercise/TextExercise.test.tsx`

**US4 checkpoint**: Power-Points reflection (and any other text-exercise prompt with numbered/bulleted lines) renders as a structured list.

---

## Phase 7: Polish & Cross-Cutting

- [X] T080 [P] Run full Vitest suite: `pnpm vitest run` — all tests GREEN (iter5's 234 + US1/US2/US3/US4 additions). Record the new total in the commit message.
- [X] T081 [P] Run production build: `pnpm build` — clean, no TypeScript or Vite errors. Additionally, per Constitution §IV (Performance), verify the gzipped bundle delta vs `main` is ≤ 10 KB. If the delta exceeds 10 KB, either trim or justify it in the plan's Complexity Tracking table before merge. (Command: `du -b dist/assets/*.js.gz 2>/dev/null \| awk '{s+=$1}END{print s}'` on both branches; record the diff in the implementation commit message.)
- [X] T082 [P] Append §11 Iter-6 block to `db/seeds/ip-review.md`: list the 4 new exercise rows + their attribution status, the soft-hidden `my-core-style` row, and the WATUSI `interaction='sorted'` flip. Document `psp_content.md` source line ranges (468–620).
- [ ] T083 Apply migration 016 to a Supabase branch and run `db/tests/016_deep_dive_exercises_invariants.sql` + `db/tests/016_idempotency.sql` end-to-end (already done locally in T050; this is the staging/branch run)
- [ ] T084 [P] Lighthouse spot-check on `/course/personality`: TTI ≤ 3 500 ms, LCP ≤ 2 500 ms (per `quickstart.md` §6)
- [ ] T085 [P] Manual walk-through of `quickstart.md` §1, §2, §3 (all paths), §4 regression checks
- [X] T086 Update `CLAUDE.md` SPECKIT block to point at this plan if not already done (verified during /speckit-plan; re-confirm)
- [ ] T087 Final IP review sign-off update in `db/seeds/ip-review.md` (facilitator Bijo Abraham); commit once approved (may be out-of-band — block PR merge on sign-off, NOT on commit)
- [ ] T088 Commit: split into two PRs gated on §11 IP sign-off — **PR 1**: Phases 2–4 + Phase 6 (code/CSS only, no content/migration changes — can ship the moment its review approves). **PR 2**: Phase 5 (seed + migration 016) + Phase 7 polish — held until the IP review block in `db/seeds/ip-review.md` carries the facilitator sign-off. (Same content-vs-code split logic used by every prior content-touching iteration; iter5 was a single commit because all content was net-new and reviewed together.)

---

## Dependencies

```text
Phase 1 (Setup) ──► Phase 2 (Foundational, BLOCKING)
                          │
                          ├─► Phase 3 (US1, P1)  ──┐
                          │                        │
                          ├─► Phase 4 (US2, P1)  ──┤   (US2 depends on US1's CSS — but
                          │                        │    they can be developed in parallel
                          │                        │    by separating the test file edits)
                          │                        │
                          ├─► Phase 5 (US3, P2)  ──┤
                          │                        │
                          └─► Phase 6 (US4, P3)  ──┤
                                                   │
                                                   ▼
                                              Phase 7 (Polish)
```

Notes:

- US1 and US3 share no files except `db/seeds/course-content.json` (US1's `attitude-types-watusi` edit + US3's four new rows). Land US1's seed edit and the US3 seed edits in the same commit to avoid mid-state oddities.
- US1 and US2 share `RankingExercise.module.css`. Resolve by doing US1's CSS first; US2's CSS work piggy-backs.
- US4 has no overlap with US1/US2/US3 outside Phase 2 prerequisites — fully parallelizable after Phase 2.

---

## Parallel Execution Examples

### After Phase 2 completes, three streams in parallel

- **Stream A (US1 + US2)**: T010 → T011 [P], T012 [P], T013 [P], T014 [P], T020 → T015 → T016 → T017 → T018 / T021 → T022 → T023
- **Stream B (US3)**: T030 → T031 [P], T032 [P], T033 [P], T034 [P], T035 [P] → T036 → T037, T038, T039 (sequential) → T040, T041 → T042a (RED) → T042b (impl + GREEN) → T043, T044, T045, T046 → T047 → T048 → T049 → T050 → T051 → T052
- **Stream C (US4)**: T060 → T061 → T062 → T063

### Within US3, after T036

- T037, T038, T039 are NOT `[P]` — T039 imports the `CheckboxExercise` and may share styling; safer sequential
- T043, T044, T045, T046 all touch `db/seeds/course-content.json` — must run sequentially

### Polish phase (Phase 7)

- T080, T081, T082, T084, T085 are all `[P]` — different commands, different files

---

## Implementation Strategy

**MVP**: US1 + US2 (both P1). These unblock the Attitudes section progression and fix the participant-blocking UX bug. Ship as a fast PR.

**Iteration 2 (same branch, next PR)**: US3 (P2). Adds the matched-style deep-dive. Larger content payload, needs IP sign-off.

**Iteration 3 (same branch)**: US4 (P3). Pure polish; can ship anytime after Phase 2.

**Independent test criteria recap**:

| Story | Test criteria |
|---|---|
| US1 (P1) | Tick W=5, A=3, I=1 on checklist → advance → WATUSI slide shows rows in order W/A/I/T/U/S with no drag handles + no # column → advance |
| US2 (P1) | At 375×667, WATUSI slide's count chip stays inside row + sticky Next button stays visible |
| US3 (P2) | Quiz E+T → 4 deep-dive slides show only HIGH-D content; ticks on Traits Checklist persist; section ends without `my-core-style` |
| US4 (P3) | Power-Points prompt renders 6 numbered items as a vertical list |

---

## Task Count Summary

- Phase 1 (Setup): **3** tasks
- Phase 2 (Foundational): **6** tasks
- Phase 3 (US1): **9** tasks (5 tests + 3 impl + 1 verify)
- Phase 4 (US2): **4** tasks (1 test + 2 impl + 1 verify)
- Phase 5 (US3): **24** tasks (6 tests + 1 lib + 6 components + 1 RED `groupComplete` test (T042a) + 1 `groupComplete` impl (T042b) + 5 seed + 3 migration + 2 wire-up — net +1 vs initial draft due to /speckit-analyze A1 split)
- Phase 6 (US4): **4** tasks (1 test + 2 impl + 1 verify)
- Phase 7 (Polish): **9** tasks
- **Total: 59** tasks

All tasks follow the strict checklist format: `- [ ] TID [P?] [USn?] Description with file path`.
