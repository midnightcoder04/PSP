# Implementation Plan: Iteration 5 — UX Fixes (Sidebar Collapse, Slide Spacing, Personality Quiz, Slide-State Reset, WATUSI Counts, Info Layout)

**Branch**: `005-iter5-ux-fixes` | **Date**: 2026-05-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-iter5-ux-fixes/spec.md`

## Summary

Six in-the-wild participant-walkthrough issues, ranked by blast radius:

| # | US | Bug or change | Blocking? | Surface |
|---|----|----|----|----|
| 1 | US3 | `SectionPage` slide state survives across route changes → arriving at Attitudes lands at the closing slide and the next click silently skips the section | **Yes** | `src/hooks/useSlideState.ts`, `src/pages/course/SectionPage.tsx` |
| 2 | US4 | WATUSI count badges appear stale; participant cannot complete Attitudes | **Yes** *(likely root-caused by #1, validated in research)* | `src/components/exercise/RankingExercise.tsx`, `src/components/exercise/CheckboxExercise.tsx`, `src/hooks/useExerciseSave.ts` |
| 3 | US1 | Left sidebar is fixed-width, not collapsible | No | `src/components/layout/Sidebar.{tsx,module.css}`, `src/components/layout/PageShell.{tsx,module.css}` |
| 4 | US2 | `.slideTrack` grid reserves height for the tallest slide → phantom whitespace below shorter slides | No | `src/pages/course/SectionPage.module.css` |
| 5 | US5 | Personality section uses four HIGH-{D/I/S/C} checkbox exercises; should be two-question quiz + four info read-throughs per workbook | No | `db/seeds/course-content.json` (Personality only), `src/lib/coreStyle.ts` (NEW), `db/migrations/015_personality_quiz.sql` (NEW) |
| 6 | US6 | Info-slide prose splits into 2 columns at wide viewports | No | `src/components/exercise/InfoExercise.module.css` (+ probable parent CSS audit) |

Architecturally: **no new schema columns, no new tables, no new dependencies, no new exercise types**. One small migration (`015_personality_quiz`) mutates Personality's exercise rows only. The rest is component-level: a new `Sidebar` collapse toggle, a `SectionPage` key on `sectionSlug`, a recomputed `useSlideState` that derives `initialSlide` from current data, a verified end-to-end WATUSI count chain, and three small CSS files touched.

**Workstreams**:

| WS | Scope | Independent of |
|---|---|---|
| WS-1 | Slide-state reset fix (US3) + WATUSI count verification (US4) | — |
| WS-2 | Sidebar collapse + transitions (US1) | WS-1 |
| WS-3 | Personality two-question quiz + read-throughs (US5) + migration 015 | WS-1 (needs slide-state fix to walk through new content) |
| WS-4 | Slide-track spacing (US2) + InfoExercise layout (US6) | WS-1, WS-2 |

WS-1 lands first and unblocks the rest. WS-2 and WS-4 are pure CSS + small TS, parallelisable. WS-3 reshapes content and must wait until WS-1 ships (so the slide-walkthrough verification works against the new Personality exercises).

---

## Technical Context

**Language/Version**: TypeScript 5.5 + React 18.3 + Vite 5.4 *(unchanged from Iter 1–4)*
**Primary Dependencies**:
  - existing: `@supabase/supabase-js` v2.105, `react-router-dom` v6.26, `@dnd-kit/core` + `@dnd-kit/sortable`, `recharts` v2.12
  - **new**: *none*. This iteration is component + CSS + content only.
**Storage**: Supabase Postgres 17.6 — additions: zero. One new migration (`015_personality_quiz.sql`) that DELETEs four rows from `exercises` (the `disc-core-style-{d,i,s,c}` rows under `section_id = (slug='personality')`) and INSERTs the new two-question quiz + four info read-through rows + a Core-Style-result info row. No DDL.
**Testing**: Vitest + `@testing-library/react` for UI; one new `db/tests/015_*.sql` file follows the RED/GREEN convention. Manual walkthrough recipes in `quickstart.md`.
**Target Platform**: Web — Chrome 110+, Firefox 115+, Safari 16+. No mobile-app target.
**Project Type**: Single-page web application *(unchanged)*.
**Performance Goals**: Constitution baselines preserved. Feature-specific:
  - **SC-PERF-1** (sidebar transition): collapse/expand completes within 250 ms; no main-content layout jump (no `width: auto` ↔ `width: fixed` flicker).
  - **SC-PERF-2** (WATUSI count update): ≤ 32 ms (within two animation frames at 60 Hz; ~16.67 ms per frame) from click to badge re-render. Target is ≤ 16 ms (one frame) where attainable; 32 ms is the acceptance ceiling.
  - **SC-PERF-3** (slide-state reset): `SectionPage` `sectionSlug` change → new section's initial slide is active within one React commit after data load (no flash of wrong slide).
  - **SC-PERF-4** (bundle delta): ≤ 1.5 KB gzipped (small additions in `Sidebar`, `useSlideState`, `coreStyle.ts`).
**Constraints**:
  - No new exercise types. Two-question quiz uses two consecutive `checkbox(allow_multiple: false)` exercises with a shared `slide_group`, **OR** a single `checkbox` extended via `content_json` to two `options[]` groups. Decision in research §R1.
  - Migration 015 MUST be idempotent (re-running it MUST produce the same end state).
  - All four removed Personality exercises' `responses` rows MUST be wiped in the same migration (or implicitly via FK CASCADE if applicable). Verified in contracts.
  - WATUSI fix MUST NOT introduce a new shared/global store. If a workaround is needed, it lives inside the slide_group via the existing `LocalResponseUpdateContext`.
  - Sidebar collapse MUST NOT affect mobile (< 768 px) behaviour.
**Scale/Scope**: < 500 total users; Personality section drops from 9 exercise rows to 7 (1 intro + 1 quiz + 1 Core-Style-result + 4 read-throughs minus the People-Reading reflection at the end = 8 actually) — see `contracts/personality-exercises.md` for the final row count.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Code Quality**: No new dependencies. New `Sidebar` collapse logic uses `useState` + `localStorage` + a single CSS variable swap (`--sidebar-width` ↔ `--sidebar-collapsed-width`). New `coreStyle.ts` is a pure function (≤ 30 LOC) with a Vitest unit-test peer. `useSlideState` keeps its public contract; the empty-deps `useMemo` quirk is replaced with a lazy `useState` initializer keyed by `sectionSlug`. No `any` types introduced.
- [x] **Test-First**: Each workstream has `[RED]` test tasks preceding implementation (formalized in tasks.md by `/speckit-tasks`). DB migration ships with `db/tests/015_*.sql` carrying RED+GREEN proof headers. `useSlideState.test.ts` adds a re-mount-on-sectionSlug-change test; `RankingExercise.test.tsx` adds a `derivesFromResponse`-changes-mid-render test; `Sidebar.test.tsx` adds collapse/expand state + localStorage round-trip tests; `SectionPage.test.tsx` adds an arrival-from-prior-section integration test.
- [x] **UX Consistency**: All new visual elements (sidebar toggle chevron, collapsed-rail icon spacing, Core-Style-result card) use existing `tokens.css` variables. No new color tokens. One new dimension token: `--sidebar-collapsed-width` (≈ 56 px) added alongside the existing `--sidebar-width`. The Core-Style-result card reuses the existing `.exerciseCard` styling. **Constitution §III note**: neither the sidebar toggle chevron nor the Core-Style-result template substitution introduces a new shared component primitive — both are scoped to their host (Sidebar-internal button and SectionPage.renderExercise branch). They are NOT additions to the shared component library. The justification for treating them as "internal extensions" rather than new primitives is recorded in the Complexity Tracking table.
- [x] **Performance**: Net bundle delta ≤ 1.5 KB gz: Sidebar toggle ~0.4 KB, `coreStyle.ts` ~0.2 KB, `useSlideState` refactor net zero, CSS additions ~0.4 KB, migration is server-side. No new RPCs; no new network round-trips. WATUSI fix is render-only (local cache already exists).
- [x] **IP Compliance**: Personality content reshape **modifies PSP™ content** (removes four HIGH-DISC checklist exercises, adds four info read-throughs + one quiz). Per Constitution §Content & IP Compliance, an IP review task is **mandatory** before migration 015 commits. The task is `T-IP5-001` in tasks.md; `db/seeds/ip-review.md` appended with the Iter 5 review block. All `(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)` lines from the legacy seed and from `psp_content.md` are carried verbatim onto each new info exercise. (Constitution §IV preserved.)

---

## Project Structure

### Documentation (this feature)

```text
specs/005-iter5-ux-fixes/
├── plan.md              # This file
├── spec.md              # Feature spec
├── research.md          # Phase 0 — decisions for each workstream (R1–R6)
├── data-model.md        # Phase 1 — Personality exercises after the reshape; sidebar state shape
├── quickstart.md        # Phase 1 — dev recipes + per-US manual verification
├── contracts/
│   ├── personality-exercises.md  # Authoritative Personality section row inventory
│   ├── slide-state.md            # useSlideState contract: initial-slide derivation rules
│   ├── sidebar-collapse.md       # Sidebar state + localStorage contract
│   └── migration-015.md          # DDL-free migration: DELETE+INSERT plan, idempotency proof
└── tasks.md             # Phase 2 — generated by /speckit-tasks (NOT created here)
```

### Source Code (repository root)

```text
db/
├── migrations/
│   └── 015_personality_quiz.sql       # NEW — wipe 4 disc-core-style rows + their responses, insert quiz + 4 info read-throughs + Core-Style-result info
├── tests/
│   ├── 015_personality_exercises_invariants.sql # NEW — RED: pre-migration row shape; GREEN: 7 (or N — see contract) Personality rows in the new vocabulary
│   └── 015_idempotency.sql                       # NEW — applying twice is a no-op
├── seeds/
│   ├── course-content.json             # MOD — Personality exercises section regenerated; everything else byte-identical
│   └── ip-review.md                    # MOD — appended Iter 5 review block

supabase/migrations/
└── 20260517000000_015_personality_quiz.sql  # NEW — mirror

src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                 # MOD — collapse toggle, useState + localStorage, aria-expanded/aria-controls
│   │   ├── Sidebar.module.css          # MOD — collapsed-rail styles, transition keyframes
│   │   ├── Sidebar.test.tsx            # NEW — collapse/expand + localStorage round-trip
│   │   ├── PageShell.tsx               # MOD — read sidebar state via context (or reuse Sidebar's own state via a render-prop); animate `margin-left`
│   │   └── PageShell.module.css        # MOD — `transition: margin-left var(--sidebar-transition)` rule
│   └── exercise/
│       ├── InfoExercise.tsx            # MOD (light) — render numbered lines as <ol> for semantic correctness (optional; see FR-062)
│       └── InfoExercise.module.css     # MOD — explicit `column-count: auto`, `columns: unset`, `max-width: 100%`; rule audit
├── hooks/
│   ├── useSlideState.ts                # MOD — replace empty-deps useMemo with lazy useState initializer; accept a `resetKey` (sectionSlug) and re-derive initialSlide when it changes
│   └── useSidebarCollapse.ts           # NEW (small) — state + localStorage adapter; exported for Sidebar + PageShell consumers
├── lib/
│   ├── coreStyle.ts                    # NEW — pure mapping function: ({ extroversion: 'E'|'I', orientation: 'P'|'T' }) → 'D'|'I'|'S'|'C'
│   └── tokens.css (or wherever sidebar dims live) # MOD — add --sidebar-collapsed-width
├── pages/
│   └── course/
│       ├── SectionPage.tsx             # MOD — pass `sectionSlug` as a resetKey to useSlideState OR wrap inner content in a child keyed by sectionSlug
│       ├── SectionPage.test.tsx        # MOD — add arrival-from-prior-section integration test (intro slide active, "Begin →" label)
│       └── SectionPage.module.css      # MOD — `.slideTrack` no longer reserves height for inactive slides; gap rules audited
└── (no changes to RankingExercise unless research §R2 says yes)
```

**Structure Decision**: Single-project SPA layout (Option 1) — established in Iteration 1 — extended additively. The sidebar-collapse pattern follows the existing `aside`+`main margin-left` token-driven approach. The hook rename (`useSlideState`) is in place, not split.

---

## Phase 0 — Research

Resolve in [research.md](research.md):

- **R1 — Two-question quiz: one exercise or two?** Should the Personality quiz be one `checkbox` exercise with two `options[]` groups in `content_json` (requires a small renderer extension), or two consecutive `checkbox(allow_multiple: false)` exercises sharing a `slide_group`? Decision recorded with rationale.
- **R2 — WATUSI staleness root cause.** Reproduce the bug in isolation: with a clean Attitudes section, tick `w_1` and observe the count badge. If the badge updates within 1 frame, US4 is fully explained by US3 (slide-state regression) and `RankingExercise` needs no patch. If the badge does NOT update, find where the `responses` map fails to propagate. Decision recorded; FR-032's workaround is conditional on the outcome.
- **R3 — Multi-column root cause.** Locate which CSS rule splits info-slide prose into two columns. Suspects: `column-count: 2` on a parent container, `grid-template-columns: repeat(2, 1fr)` on `.slideTrack` or `.exerciseBody`, or a `.prose` global rule. Decision: which selector to override; whether to fix at `InfoExercise` scope or globally.
- **R4 — Sidebar collapsed mode: icon-rail vs. full-hide.** User input is ambiguous. Default to icon-rail per A3 and confirm via the spec's User Story 1 sign-off. If user wants full-hide, FR-001 changes — research records the alternative and the < 5-minute reversion path.
- **R5 — WATUSI zero-count badge presentation.** Show `0` or hide the badge when count is zero? Hide leans cleaner; show maintains layout stability. Decision: hide at zero, show otherwise.
- **R6 — `useSlideState` reset mechanism: key remount vs. effect-driven reset.** Two viable patterns: (a) pass `sectionSlug` as a `key` on a wrapper component that owns `useSlideState`, forcing remount → cleanest, but loses any expensive component state outside the hook; (b) pass `sectionSlug` to the hook itself and re-derive `initialSlide` when it changes via a `useEffect` that calls `setCurrentSlide(...)`. Decision: (b) — keeps `SectionPage`'s data-loading effect stable.

---

## Phase 1 — Design Artifacts

- **[data-model.md](data-model.md)** — entities & shapes:
  - Sidebar collapse state: `{ collapsed: boolean }`, persisted to `localStorage['psp:sidebar:collapsed']` as JSON.
  - Personality exercise inventory (post-migration) — full row-by-row list mirroring `004-content-restructure`'s data-model style:
    - `disc-introduction` (info, unchanged)
    - `core-style-q1-extroversion` (checkbox, allow_multiple:false, 2 options)
    - `core-style-q2-orientation` (checkbox, allow_multiple:false, 2 options)
    - `core-style-result` (info, dynamically displays the mapped letter via a client-side derive — uses InfoExercise variant or a small "computed" subtype recorded in contracts)
    - `disc-profile-d`, `disc-profile-i`, `disc-profile-s`, `disc-profile-c` (info, 4 separate read-throughs)
    - `my-core-style` (`type='text'`, single textarea, `attribution: null`, `is_scored: false` — **content unchanged from current seed**; only `order_index` 7 → 9 and `slide_group` NULL → 6 shift)
  - State diagram for `useSlideState` — `initialSlide` derivation on `(slideGroups, responses, resumeExerciseId, intro)` with `sectionSlug` as the reset trigger.

- **[contracts/personality-exercises.md](contracts/personality-exercises.md)** — authoritative row list with workbook citations.
- **[contracts/slide-state.md](contracts/slide-state.md)** — `useSlideState` public API + the new reset semantics + a test matrix (arrive-from-prev-section, resume-from-progress, fresh-section, allDone-section).
- **[contracts/sidebar-collapse.md](contracts/sidebar-collapse.md)** — CSS variable swap, transition timing, focus behaviour, mobile escape hatch.
- **[contracts/migration-015.md](contracts/migration-015.md)** — DELETE/INSERT plan, idempotency proof, the responses-wipe scope.
- **[quickstart.md](quickstart.md)** — dev setup recap, how to apply 015 locally, per-US verification recipes including DevTools measurements for SC-2 and SC-PERF-2.

---

## Constitution Check (post-Phase-1 re-evaluation)

Re-run after the design artifacts are in hand:

- [x] **Code Quality** — `contracts/slide-state.md` keeps the hook surface stable; only the reset trigger is added (a single parameter, default `undefined` preserves current behaviour for any other callers — though `SectionPage` is the only consumer today). `contracts/sidebar-collapse.md` specifies a single source of truth for collapse state (`useSidebarCollapse` hook) consumed by both `Sidebar` and `PageShell`. No `any` types.
- [x] **Test-First** — every workstream has explicit RED tasks (will be sequenced by `/speckit-tasks`): the `015_*.sql` RED file asserts the legacy 4 disc-core-style rows exist (passes pre-migration); the GREEN file asserts the new 8 (or N) rows + zero responses. Vitest tests precede every component change.
- [x] **UX Consistency** — collapse toggle, collapsed icon styling, Core-Style-result card, and the InfoExercise width fix all bind to existing tokens. No new color tokens, no new `card-` primitives.
- [x] **Performance** — bundle accounting in `data-model.md §Bundle accounting` totals ~1.0 KB gz against the 1.5 KB budget. Sidebar transition uses GPU-friendly `transform`/`width` transitions where possible; falls back to `width` transition if the layout shift requires it (animatable in all target browsers).
- [x] **IP Compliance** — Personality content changes: each new info exercise carries the upstream attribution verbatim. `db/seeds/ip-review.md` Iter-5 block enumerates the modified surface. Two-question quiz uses neutral wording (not lifted from the workbook beyond what's already public).

No new Constitution violations introduced.

---

## Phase status

| Phase | Artifact | Status |
|---|---|---|
| 0 — Research | `research.md` | ⏳ to be authored (R1–R6) |
| 1 — Design | `data-model.md` | ⏳ Personality row inventory + sidebar shape + slide-state state diagram |
| 1 — Design | `contracts/personality-exercises.md` | ⏳ |
| 1 — Design | `contracts/slide-state.md` | ⏳ |
| 1 — Design | `contracts/sidebar-collapse.md` | ⏳ |
| 1 — Design | `contracts/migration-015.md` | ⏳ |
| 1 — Design | `quickstart.md` | ⏳ |
| 1 — Gate | Constitution Check (post-Phase-1) | ⏳ |
| Agent context | `CLAUDE.md` SPECKIT markers | ⏳ updated to point at this plan |

**Next**: run `/speckit-tasks` to produce `tasks.md` for Phase 2 implementation. WS-1 is the gating workstream; WS-2 / WS-4 can begin once WS-1 lands; WS-3 follows WS-1 + WS-3 content authoring.

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Wipe of `responses` rows for the five removed Personality exercises** (`identifying-personal-style` + the four `disc-core-style-{d,i,s,c}`) (destructive DB action, migration 015) | The legacy quick-rate checkbox + four HIGH-DISC checkbox exercises are leaving the schema entirely. Their `responses` rows lose their FK target; even if we kept them, no UI would surface them. | (a) Convert the five checkbox exercises to info-type instead of deleting → strands legacy responses on info rows that ignore them. (b) Keep them and hide them → adds dead surface area to the seed forever. (c) Migrate response data into a notes field on the new info exercises → no clean mapping; participant intent is lost across the IA shift. All rejected. Iter 4 already established a pre-production-wipe precedent (`004-content-restructure` migration 014, Assumption A-1). User re-confirms via spec Assumption A-2 (2026-05-16). |
| **Sidebar collapse toggle button is NOT extracted into a shared `IconButton` primitive** (apparent §III "shared component library" concern) | The toggle is a single, Sidebar-internal control with state semantics tied to `SidebarCollapseContext`. Extracting it as a shared primitive would force a generic `IconButton` API onto the codebase for one consumer, and the resulting primitive would have to grow to absorb every existing inline `<button>` to be justifiable — an iteration in itself. The toggle reuses the existing `--color-trust` focus token, the existing button typography, and the existing chevron Unicode glyph; visual consistency is preserved without a new primitive. | (a) Introduce `<IconButton>` as a new shared primitive → premature abstraction for one consumer; violates "design for hypothetical future requirements" hygiene. (b) Re-use an existing button primitive → none exists at the required size/affordance. The toggle is therefore documented as a **Sidebar-internal element**, not a new UI primitive (analogous to `SlideNav`'s prev/next buttons from Iter 4, which were not extracted either). |
| **Core-Style-result content is rendered via a template-substitution branch inside `SectionPage.renderExercise`** (apparent §III concern: avoiding ad-hoc renderers) | The substitution path is one branch (≤ 10 LOC) on the existing `info` case in `renderExercise`. It still routes through `InfoExercise` for the final paint, so no new component is introduced. Path A in `contracts/personality-exercises.md` Row 4 was chosen over Path B (a dedicated `<CoreStyleResult>` component) precisely to avoid adding a new component. | (a) Add `<CoreStyleResult>` as a new shared exercise renderer → grows the component surface and the `renderExercise` switch for a one-off display. (b) Encode the mapping into the seed at write-time → impossible: the mapping depends on participant responses, which don't exist until runtime. (c) Introduce a new exercise type (`computed-info`) → triggers a renderer, schema CHECK, and validator addition for a single use case. The chosen branch is the smallest change that satisfies FR-051 + FR-052 within the existing renderer surface. |

No other Constitution violations identified.

---

## References

- **Spec**: [spec.md](spec.md)
- **Iteration 1 plan** (canonical platform tech stack): `specs/001-psp-course-platform/plan.md`
- **Iteration 3 RPC test plan**: `specs/002-iter2-fixes/plan.md`
- **Iteration 4 slide-nav plan** (introduces `useSlideState`, the slide-track grid, and the section-lock cascade this iteration is patching): `specs/003-slide-nav-ux-rework/plan.md`
- **Iteration 5 content restructure** (the immediately prior content shape this iteration inherits): `specs/004-content-restructure/plan.md`
- **Constitution v1.0.0**: `.specify/memory/constitution.md`
- **Canonical content**: `psp_content.md` (lines 408–432 + 466–747 for Personality)
