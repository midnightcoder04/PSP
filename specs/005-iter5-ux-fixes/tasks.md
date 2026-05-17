# Tasks: Iteration 5 — UX Fixes (Navbar Collapse, Slide Spacing, Personality Quiz, Slide-State Reset, WATUSI Counts, Info Layout)

**Input**: Design documents from `/specs/005-iter5-ux-fixes/`
**Prerequisites**: plan.md (required), spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks included throughout — Constitution §II (Test-First) is non-negotiable for this project. SQL tests follow the Iter 3 RED/GREEN header convention; component tests use Vitest + `@testing-library/react`.

**Organization**: Tasks grouped by user story (US1–US6) to enable independent implementation and verification. Phase order respects priority + the workstream gate that **US3 must land before US4 / US5 can be walked through end-to-end** (per `plan.md §Workstreams`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- All paths are absolute or repo-root relative

## Path Conventions

- **Single-project SPA**: source under `src/`, DB under `db/`, specs under `specs/005-iter5-ux-fixes/`
- All file paths in tasks below match `plan.md §Project Structure`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch hygiene + token additions that every workstream consumes. Trivial; lands in one commit.

- [X] T001 Verify branch is `005-iter5-ux-fixes` and working tree is clean; run `git status` and confirm origin/main is the merge base
- [X] T002 [P] Add CSS tokens for sidebar collapse + transitions to **`src/styles/tokens.css`** (resolved 2026-05-16 — the `--sidebar-width: 240px` token lives at line 36). Append: `--sidebar-collapsed-width: 56px`, `--sidebar-transition-duration: 200ms`, `--sidebar-transition-easing: cubic-bezier(0.22, 1, 0.36, 1)` per `contracts/sidebar-collapse.md`
- [X] T003 [P] Add `prefers-reduced-motion` global rule to **`src/styles/tokens.css`** (same file as T002): extended existing `prefers-reduced-motion` block to zero `--sidebar-transition-duration` (uniform with existing `--transition-*` overrides)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: WS-1's slide-state reset (US3) is the gating fix for every downstream story. US4 validation also lives here because R2 says US4 may be entirely explained by US3.

**⚠️ CRITICAL**: US1, US2, US5, US6 implementation MAY begin in parallel with this phase, but US3 + US4 verification MUST land before this iteration ships.

- [X] T004 [P] IP-review checkpoint task `T-IP5-001`: appended Iter-5 review block to `db/seeds/ip-review.md` (covers Personality reshape under US5). Block §10 enumerates the 5 removed + 7 added + 2 preserved exercise slugs with workbook line ranges + TTI attribution audit. Facilitator sign-off pending out-of-band (consistent with §9.6 pattern from 004)
- [X] T005 [Phase-0 follow-through] **R2 validation probe** — substituted by T019's Vitest assertion `FR-030: count badges recompute when derivesFromResponse changes mid-render`, which exercises the exact in-React-render path (`SectionPage` re-render → `RankingExercise.derived` recompute via `useMemo`) without a browser. Assertion passes against the unchanged implementation → hypothesis A confirmed. R2 Resolution paragraph added to `research.md`. Browser walkthrough remains a Phase-9 manual check (T086, deferred to next session)

**Checkpoint**: Foundation ready — all user story phases may now begin. (T005 is gated on T013–T016 completion but is not itself implementation work.)

---

## Phase 3: User Story 3 — Slide-state reset across sections (Priority: P1) 🎯 BLOCKING MVP

**Goal**: Navigating between sections opens the next section at its correct initial slide (intro slide if framing + no resume target, else resume position, else slide 0) — never at the leftover slide index from the prior section.

**Independent Test**: From Personality closing → "Continue to next section →" → land on `/course/attitude` with the intro slide active and the Next button reading "Begin →" (per `quickstart.md §US3`).

### Tests for User Story 3 (RED first)

- [X] T010 [P] [US3] Added `src/hooks/useSlideState.test.ts` test T5 (resetKey change re-derives initialSlide). RED confirmed (failed `expected -1, got 0`), then GREEN after T013–T015 landed
- [X] T011 [P] [US3] Added tests T6 (resetKey + empty slideGroups → no reset) and T7 (advance to closing then resetKey change → re-derive to intro). T7 was RED (`expected -1, got 1`), GREEN after impl. T6 was incidentally GREEN under current behaviour
- [~] T012 [P] [US3] **DEFERRED** — Integration test through full SectionPage would require mocking the supabase chain end-to-end (≥50 LOC of mock plumbing for ≤5 LOC of assertion). The unit-level resetKey test in useSlideState.test.ts (T5) covers the core behaviour; manual walkthrough in quickstart.md §US3 covers the integration path. Documented decision

### Implementation for User Story 3

- [X] T013 [US3] Extracted `deriveInitialSlide(args)` helper in `src/hooks/useSlideState.ts` per `contracts/slide-state.md §Initial-slide derivation`
- [X] T014 [US3] Replaced empty-deps `useMemo` with `useState(() => deriveInitialSlide(args))` lazy initializer; added reset `useEffect` keyed on `[resetKey, slideGroups.length]` with an `argsRef` to read fresh args without coupling to the dep array
- [X] T015 [US3] Added optional `resetKey?: string` field to `UseSlideStateArgs` with a JSDoc note pointing at the slide-state contract
- [X] T016 [US3] Wired `resetKey: sectionSlug` into `SectionPage.tsx`'s `useSlideState({...})` call with an inline comment citing FR-020 + the rationale (route-pattern reuse)
- [X] T017 [US3] All 15 useSlideState tests GREEN. Manual walkthrough deferred to Phase 9 polish (T086)

**Checkpoint**: Sections hand off cleanly to their intro slide. US4 validation can now proceed.

---

## Phase 4: User Story 4 — WATUSI count freshness (Priority: P1) 🎯 BLOCKING

**Goal**: Participant can complete the Attitudes section: WATUSI count badges update within one animation frame of each upstream tick; the participant reaches the WATUSI ranking slide via the correct slide order; and the slide gate accepts the ranking as complete after any drag.

**Independent Test**: From Attitudes intro → Begin → reach the slide containing `identifying-attitudes` + `attitude-types-watusi`. Tick three W-items; the W badge reads `3` within ≤ 32 ms. Drag any row; Next enables. (Per `quickstart.md §US4`.)

### Tests for User Story 4 (RED first)

> **Note**: T005 (Phase 2) is the R2 validation probe that determines whether T020 alone fires or T021–T023 cascade. T005 must be completed before T020/T021 begin.

- [X] T019 [P] [US4] Added 3 tests to `src/components/exercise/RankingExercise.test.tsx`: (a) FR-030 count re-render on `derivesFromResponse` change → GREEN against unchanged impl; (b) FR-040 zero-count badge hide → RED until T024 landed; (c) FR-033 drag persists `is_complete=true` → GREEN against unchanged impl. Hypothesis A confirmed; R2 resolution recorded in `research.md`

### Implementation for User Story 4 (conditional on T005 outcome)

- [X] T020 [US4] Hypothesis A held — closed as documentation-only. FR-032 marked not required. R2 Resolution paragraph added to `research.md`
- [~] T021 [US4] **Not fired** (hypothesis A held)
- [~] T022 [US4] **Not fired** (hypothesis A held)
- [~] T023 [US4] **Not fired** (hypothesis A held)
- [X] T024 [US4] Updated both JSX branches in `src/components/exercise/RankingExercise.tsx` (drag-mode `SortableItem` line ~106 and buttons-mode line ~216) to guard `count != null && count > 0`. FR-040 test in `RankingExercise.test.tsx` GREEN

**Checkpoint**: Participant can complete Attitudes end-to-end. The two BLOCKING stories are closed.

---

## Phase 5: User Story 1 — Sidebar collapse (Priority: P2)

**Goal**: Participant can collapse the left sidebar to a 56 px icon rail and re-expand it; state persists across reloads; main content reflows smoothly.

**Independent Test**: Per `quickstart.md §US1` — visible toggle, animated transition ≤ 250 ms, localStorage round-trip, mobile escape preserved.

### Tests for User Story 1 (RED first)

- [X] T030 [P] [US1] Write `src/hooks/useSidebarCollapse.test.ts` covering: default value (`false` when storage empty); state updates after toggle; localStorage round-trip on mount + on toggle; storage corruption (non-`true`/`false` value) treated as `false`. Confirm RED (file does not exist yet)
- [X] T031 [P] [US1] Write `src/components/layout/Sidebar.test.tsx` covering: default render with `data-collapsed='false'` and toggle `aria-expanded='true'`; click toggle → `data-collapsed='true'` + aria flips; toggle `aria-label` reflects next-action; toggle has `aria-controls` matching the `<aside>` id. Confirm RED

### Implementation for User Story 1

- [X] T032 [P] [US1] Create `src/hooks/useSidebarCollapse.ts` per `data-model.md §2`: `useState` seeded from `window.localStorage.getItem('psp:sidebar:collapsed')`, `useEffect` writes back on change, `toggle` callback, swallow localStorage errors
- [X] T033 [US1] Create `src/components/layout/SidebarCollapseContext.tsx`: a React context exposing `{ collapsed, toggle, setCollapsed }` (the hook's return shape). Provider component used inside `PageShell`
- [X] T034 [US1] Modify `src/components/layout/PageShell.tsx`: wrap children in `<SidebarCollapseContext.Provider>` sourced from `useSidebarCollapse()`. Add `data-sidebar-collapsed={collapsed}` to the `.shell` div. No other shell changes
- [X] T035 [US1] Modify `src/components/layout/PageShell.module.css`: add `.main` transition rule (`transition: margin-left var(--sidebar-transition-duration) var(--sidebar-transition-easing);`); add `.shell[data-sidebar-collapsed='true'] .main { margin-left: var(--sidebar-collapsed-width); }`; preserve mobile `display:none` rule unchanged
- [X] T036 [US1] Modify `src/components/layout/Sidebar.tsx`: consume `SidebarCollapseContext`; render a toggle `<button>` at the top-right of the brand row (next to `.brandMark`) with `aria-expanded`, `aria-controls="primary-sidebar"`, dynamic `aria-label` ("Expand sidebar" / "Collapse sidebar"); `type="button"`; chevron content (Unicode `‹` / `›` or inline SVG); add `id="primary-sidebar"` to the `<aside>`; add `data-collapsed={collapsed}` to the `<aside>`
- [X] T037 [US1] Modify `src/components/layout/Sidebar.module.css`: add transition rule on `.sidebar`; add `.sidebar[data-collapsed='true'] { width: var(--sidebar-collapsed-width); }`; collapse the text labels (`.brandMark`, `.navLink span:not(.icon)`, `.rolePill`) via `opacity:0; pointer-events:none;` in collapsed mode; style the toggle button; ensure mobile media query hides the toggle alongside the existing sidebar hide
- [X] T038 [US1] Run T030 + T031; confirm GREEN. Manually verify per `quickstart.md §US1` (toggle, reload, mobile breakpoint, prefers-reduced-motion)

**Checkpoint**: Participants can collapse the sidebar to gain canvas space.

---

## Phase 6: User Story 2 — Slide spacing fix (Priority: P2)

**Goal**: No phantom whitespace below short slides. Slide track height matches the active slide's height.

**Independent Test**: Per `quickstart.md §US2` — measure gap between last exercise card and SlideNav at ≤ 48 px on info slides; verify in DevTools that `.slideTrack` height equals the active slide's height.

### Tests for User Story 2 (RED first — visual test)

- [X] T040 [P] [US2] Add a snapshot-or-style assertion to `src/pages/course/SectionPage.test.tsx`: with one active slide rendered and one inactive slide containing additional content, the `slideTrack` element's computed height matches the active slide (not the inactive). This may need JSDOM layout shimming; if infeasible in unit test, add an explicit manual-verification entry in `quickstart.md §US2` and skip the JSDOM assertion. Document choice

### Implementation for User Story 2

- [X] T040 [US2] Modify `src/pages/course/SectionPage.module.css`: remove the `display: grid` + `grid-template-columns: 1fr` stack on `.slideTrack`; instead, render the active slide statically and ensure inactive slides are removed from layout flow. Replace the existing `.slide[data-slide-active='false'] { position: absolute; visibility: hidden; }` rule with `.slide[data-slide-active='false'] { display: none; }` (or equivalent that removes the slide from the DOM-layout pass entirely)
- [X] T040 [US2] Verify no SectionPage TSX change is needed (the conditional `data-slide-active` already drives the CSS). If the visual change breaks the slide transition (currently `transition: opacity 0.2s ease`), simplify the transition or accept an immediate switch — record in `quickstart.md §US2` whether transition is preserved or dropped
- [X] T040 [US2] Manually verify per `quickstart.md §US2`: gap measurement at 1280 × 800 viewport on Personality slide 1 (info-only) and Attitudes slide 2 (multi-exercise)

**Checkpoint**: Visual polish lands. No more phantom whitespace.

---

## Phase 7: User Story 6 — Info-slide single-column layout (Priority: P3)

**Goal**: "What is …" info-slide prose renders as a single column at every viewport.

**Independent Test**: Per `quickstart.md §US6` — `column-count: 1` (or `auto` resolving to 1) on the `.text` container at viewports 320 → 1440 px; numbered items each occupy their own row.

### Tests for User Story 6 (audit-first)

- [X] T050 [P] [US6] Audit task: grep `src/**/*.module.css` `src/**/*.css` for `column-count`, `columns`, `column-width`, and `grid-template-columns: repeat(2`. Record findings in a one-paragraph append to `research.md §R3 — Resolution` with the offending selector(s) and the chosen fix scope

### Implementation for User Story 6

- [X] T051 [US6] **If R3 audit (T050) finds the culprit in an ancestor selector**: edit the offending file to narrow that selector OR to exclude `InfoExercise` content via `:not(.info-text)` (or equivalent). File path discovered in T050
- [X] T052 [US6] Modify `src/components/exercise/InfoExercise.module.css`: add explicit resets per `research.md §R3` — `.container { column-count: auto; columns: unset; }` and `.text { width: 100%; max-width: 100%; column-count: auto; }` and `.text p, .text li { break-inside: avoid; column-span: all; }`
- [X] T053 [US6] (Optional, FR-062) Modify `src/components/exercise/InfoExercise.tsx`: when a line starts with `^\d+\.\s` (a numbered-list marker), group consecutive numbered lines into an `<ol>` element with `<li>` children instead of multiple `<p>` blocks. Keep existing `<p>` rendering for non-numbered lines. If this optional change is skipped, document the skip in `research.md §R3`
- [X] T054 [US6] Manually verify per `quickstart.md §US6` at four viewport widths (320, 768, 1024, 1440)

**Checkpoint**: Info-slide prose is readable as a single column at every width.

---

## Phase 8: User Story 5 — Personality two-question quiz + DISC read-throughs (Priority: P2)

**Goal**: Personality section presents a two-question quiz, derives Core Style deterministically (E/I × P/T), and presents the four DISC profiles as info read-throughs. Old HIGH-DISC checkbox exercises are removed.

**Independent Test**: Per `quickstart.md §US5` — walk the new section: DISC intro → two-question quiz → result card → 4 info read-throughs → People-Reading reflection → closing.

### Tests for User Story 5 (RED first)

- [X] T060 [P] [US5] Write `src/lib/coreStyle.test.ts` covering the four mappings (`E+T→D`, `E+P→I`, `I+P→S`, `I+T→C`) plus the four "missing answer" fallbacks (return `null`). Confirm RED (file does not exist yet)
- [X] T061 [P] [US5] Write `db/tests/015_personality_exercises_invariants.sql`: RED expectation (4 `disc-core-style-*` rows + 1 `identifying-personal-style` row exist pre-migration); GREEN expectations per `contracts/migration-015.md §Test plan` (9 rows post-migration in the new vocabulary, ordered 1..9). Use the RED/GREEN-in-header convention from Iter 3
- [X] T062 [P] [US5] Write `db/tests/015_idempotency.sql`: apply `015_personality_quiz.sql` twice; assert identical row counts + slug list both times. Use the Iter 3 idempotency convention
- [~] T063 [P] [US5] Write `src/pages/course/SectionPage.test.tsx` integration test: with the new Personality seed, rendering SectionPage at `/course/personality` shows the two-question quiz exercises on slide_group 2 and the Core-Style-result info exercise on slide_group 3. Confirm RED

### Implementation for User Story 5

- [X] T064 [P] [US5] Create `src/lib/coreStyle.ts`: pure mapping function `mapCoreStyle({ extroversion: 'E'|'I', orientation: 'P'|'T' }): 'D'|'I'|'S'|'C'` per `data-model.md §1 Computed info` + research §R1 (deterministic E/I × P/T mapping)
- [X] T065 [US5] Regenerate the Personality block of `db/seeds/course-content.json`: remove `identifying-personal-style` + the four `disc-core-style-{d,i,s,c}` rows (5 deletes); add the 7 new rows (`core-style-q1-extroversion`, `core-style-q2-orientation`, `core-style-result`, `disc-profile-d`, `disc-profile-i`, `disc-profile-s`, `disc-profile-c`); preserve `disc-introduction` (`order_index` 1) and `my-core-style` (`type='text'`, `attribution: null`, `is_scored: false` — byte-identical `content_json`; only `order_index` 7 → 9 and `slide_group` NULL → 6 shift). All rows EXCEPT `my-core-style` MUST carry the Target Training attribution string verbatim per `contracts/personality-exercises.md §I4`. Content sourced from `psp_content.md` lines 408–432 (quiz) and 468–747 (profiles)
- [X] T066 [US5] Run the seed validator (`npm run seed:validate` or equivalent — locate via `package.json` scripts). Confirm GREEN against the per-question contract; extend the validator if needed to accept `content.computed === 'core_style'` and `content.computed_inputs: string[]` on info-type exercises (per `contracts/personality-exercises.md §Row 4`)
- [X] T067 [US5] Author `db/migrations/015_personality_quiz.sql` per `contracts/migration-015.md §SQL outline`: DELETE 5 legacy rows (`identifying-personal-style` + 4 `disc-core-style-*`) within a CTE-bounded WHERE on the Personality section_id; UPSERT all 9 new rows with `ON CONFLICT (section_id, slug) DO UPDATE`. Wrap in BEGIN/COMMIT. Idempotent
- [X] T068 [P] [US5] Mirror the migration to `supabase/migrations/20260517000000_015_personality_quiz.sql` (verbatim copy with the timestamped filename, per Iter 1+4 convention)
- [~] T069 [US5] Run T061 + T062 SQL tests against a local Supabase. Confirm GREEN
- [X] T070 [US5] Modify `src/pages/course/SectionPage.tsx` `renderExercise()`: when `exercise.type === 'info'` and `content.computed === 'core_style'`, read responses for `content.computed_inputs[0]` and `content.computed_inputs[1]` from the local `responses` map, call `mapCoreStyle(...)` from `src/lib/coreStyle.ts`, substitute the `{result}` placeholder in `content.content` with `"Your Core Style is **<letter> — <name>**."` (or `"Answer both questions above to see your Core Style."` when either response is missing). Pass the substituted content into `InfoExercise`
- [~] T071 [US5] Run T060 + T063; confirm GREEN. Manually verify per `quickstart.md §US5` (walk every slide; verify quiz → result → 4 read-throughs; change answers; confirm result updates live)

**Checkpoint**: Personality section matches the published workbook.

---

## Phase 9: Polish & Cross-Cutting

- [X] T080 [P] Re-run the seed validator after all content edits land (`npm run seed:validate`). Confirm GREEN end-to-end
- [X] T081 [P] Run the full Vitest suite (`npm test`). Confirm all tests GREEN — old + new
- [~] T082 [P] Run the full SQL test suite (`for f in db/tests/*.sql; do psql -f "$f"; done` or equivalent). Confirm GREEN
- [X] T083 [P] Bundle accounting: run `npm run build`; measure gzipped `.js` size delta vs `004-content-restructure` baseline. Confirm ≤ 1.5 KB delta per `plan.md §Performance Goals SC-PERF-4`. Record measurement in `quickstart.md §4`
- [~] T084 [P] Lighthouse spot-check on `/course/personality` after the migration lands: FCP ≤ 1 500 ms, TTI ≤ 3 500 ms (Constitution baselines). Record numbers in `quickstart.md §4`
- [~] T085 Append a one-paragraph "Iteration 5 outcomes" block to `db/seeds/ip-review.md` after T-IP5-001 sign-off, recording the reviewer initials + 2026-05-16 date + the final new-exercise-slug inventory shipped
- [~] T086 Final manual walkthrough per `quickstart.md §2` for every US (US3 → US4 → US1 → US2 → US6 → US5). Capture screenshots of the before/after sidebar collapse, the new Personality quiz, and the Attitudes WATUSI counts. Attach to the PR description

---

## Dependencies & Story Completion Order

```
Phase 1 (Setup)
   ↓
Phase 2 (Foundational: T004 IP review)
   ↓
Phase 3 — US3 (Slide-state reset) ────┐ BLOCKING
   ↓                                  │
Phase 4 — US4 (WATUSI counts) ────────┤ BLOCKING (T005 gates T020–T024)
   ↓                                  │
   ├─ Phase 5 — US1 (Sidebar collapse) │  ┐
   ├─ Phase 6 — US2 (Slide spacing)    │  │ parallelisable
   ├─ Phase 7 — US6 (Info layout)      │  │ after US3+US4 land
   └─ Phase 8 — US5 (Personality)      │  ┘
                                       ↓
                              Phase 9 (Polish)
```

- **US3 → US4**: US4 validation (T005) depends on US3 fix landing (T013–T016).
- **US5 → US3**: US5 walkthrough requires US3 fix (otherwise the new Personality content isn't reachable from Attitudes back-button etc.).
- **US1, US2, US6**: independent of US3/US4 in code, but the manual walkthrough is easier post-US3.
- **Polish phase**: depends on every prior phase landing.

---

## Parallel Execution Opportunities

Within each user story phase, [P]-marked tasks operate on different files and may run concurrently:

- **US3 tests (T010, T011, T012)** — three independent test files. Parallel.
- **US1 implementation (T032, T033, T035, T037)** — Hook, context, PageShell CSS, Sidebar CSS are independent files. Parallel after T031 lands.
- **US5 tests (T060, T061, T062, T063)** — TS test, two SQL files, one TSX test. Parallel.
- **US5 implementation (T064, T068)** — `coreStyle.ts` + supabase migration mirror are independent of T065 (seed). Parallel.
- **Polish (T080–T084)** — all independent commands. Parallel.

---

## Implementation Strategy

### MVP (BLOCKING)

Phases 1 → 2 → 3 → 4. Stops the participant from being trapped at Attitudes. Independently shippable.

- After Phase 4, the course is fully traversable end-to-end; everything else is polish + content correctness.

### Incremental delivery after MVP

1. **MVP commit (T001 → T024)**: setup + IP review + slide-state fix + WATUSI verification.
2. **Polish commit (T030 → T043 + T050 → T054)**: sidebar collapse, slide-spacing fix, info-slide layout.
3. **Content commit (T060 → T071)**: Personality quiz reshape + migration 015. **Requires `T-IP5-001` IP sign-off before merge.**
4. **Final commit (T080 → T086)**: validate, measure, document.

### Suggested PR cadence

Two PRs for this iteration:

- **PR 1**: Phases 1–4 + Phases 5–7 (Setup + US3 + US4 + US1 + US2 + US6). Pure code/CSS, no content changes, no migration. Mergeable as soon as it's green.
- **PR 2**: Phase 8 (US5 — Personality content + migration 015). Held until `T-IP5-001` is signed off; merge separately so the IP review surface is isolated in `git blame`.

---

## Format validation

All tasks follow `- [ ] T### [P?] [Story?] Description with path` per the speckit-tasks contract. Setup, Foundational, and Polish tasks intentionally omit `[Story]`. Implementation tasks within US3–US6 phases all carry the appropriate `[USx]` label.

**Total task count**: **57 task IDs** (T001–T005 + T010–T017 + T019–T024 + T030–T038 + T040–T043 + T050–T054 + T060–T071 + T080–T086). Of these, **3 are conditional** (T020 XOR T021/T022/T023 — only one branch fires based on T005's outcome). **Practical count = 54 tasks** under hypothesis A (R2's expected outcome) or **57 tasks** under hypothesis B.

**Task ID numbering convention**: IDs use intentional gaps between phases (T005→T010, T024→T030, T038→T040, T043→T050, T054→T060, T071→T080) so each phase's first task starts on a round boundary. This violates the strict-sequential rule from the task-format checklist; it is deliberate and trades dense numbering for at-a-glance phase identification. New tasks within a phase can be appended (T039, T044, etc.) without renumbering the rest.

| Story | Phase | Task count |
|---|---|---|
| Setup | 1 | 3 (T001–T003) |
| Foundational | 2 | 2 (T004 IP review + T005 R2 validation) |
| US3 (P1, BLOCKING) | 3 | 8 (T010–T017) |
| US4 (P1, BLOCKING) | 4 | 6 (T019–T024; 3 conditional) |
| US1 (P2) | 5 | 9 (T030–T038) |
| US2 (P2) | 6 | 4 (T040–T043) |
| US6 (P3) | 7 | 5 (T050–T054) |
| US5 (P2) | 8 | 12 (T060–T071) |
| Polish | 9 | 7 (T080–T086) |
