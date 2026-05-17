# Implementation Plan: Iter6 — Personality Deep-Dive, WATUSI Sorted Listing, Power-Points Formatting

**Branch**: `006-iter6-personality-watusi-polish` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-iter6-personality-watusi-polish/spec.md`

## Summary

Three coupled UX/content changes layered on top of iter5:

1. **WATUSI ranking → read-only sorted listing**. The slide auto-derives the
   sorted order from upstream `selected_ids` (already wired in iter5), auto-
   completes on view, drops drag/buttons and the `#` rank column, and pins
   the count chip inline so it cannot overlap the sticky `SlideNav` Next
   button. This unblocks the Attitudes-section progression that prompted
   the user's "items are to listed and not edited" instruction.
2. **Personality matched-style deep-dive**. After the four-profile read-
   through (kept from iter5), the participant sees four additional slides
   driven by their resolved core style: Characteristics, Ideal Environment,
   an optional Characteristics Checklist (persisted), and Comfort Zones.
   The legacy `my-core-style` text exercise is removed. Per-style content
   is sourced verbatim from `psp_content.md` §HIGH D/I/S/C.
3. **Polish**. `TextExercise` prompts adopt the existing `InfoExercise`
   numbered/bulleted line parser so the Power-Points reflection prompt
   reads as a vertical ordered list instead of a run-on paragraph.

Migration 016 generates from the seed via `scripts/build-migration-016.ts`
(single-source-of-truth pattern, mirroring migration 015).

## Technical Context

**Language/Version**: TypeScript 5.5 (strict), React 18.3, Node 20 (for build/tests).
**Primary Dependencies**: Vite 5.4, React Router 6.26, supabase-js 2.x, Vitest 2.1, @testing-library/react 16, @dnd-kit/sortable (kept for non-WATUSI rankings).
**Storage**: PostgreSQL 15 via Supabase. RLS-gated `exercises` + `responses` tables. Dollar-quoted JSONB literals in migration.
**Testing**: Vitest + RTL (component), Vitest (hooks/libs), SQL invariant tests under `db/tests/` for migration 016.
**Target Platform**: Modern evergreen browsers (Chromium 110+, Firefox 110+, Safari 16+). Mobile 375 px viewport minimum.
**Project Type**: SPA (Vite) + Postgres.
**Performance Goals**: TTI on `/course/personality` ≤ 3 500 ms; LCP ≤ 2 500 ms; per-slide render budget ≤ 200 ms.
**Constraints**: Read-only WATUSI listing MUST NOT regress existing non-WATUSI ranking exercises (none currently exist; future-proofing via `interaction: 'sorted'` opt-in).
**Scale/Scope**: ~12 new exercise rows added to the personality section seed, 1 removed. ~6 modified component files. ~3 new tests files.

## Constitution Check

- [x] **Code Quality** — no new abstractions beyond the seed → component
      contract for `sections_by_style` / `options_by_style`. Complexity
      Tracking table empty (no exceptions).
- [x] **Test-First** — RED→GREEN cycle for:
      `RankingExercise.test.tsx` (read-only + auto-complete-on-mount),
      `TextExercise.test.tsx` (prompt parser),
      `coreStyleDeepDive.test.tsx` (per-style content selection +
      missing-quiz fallback). Migration invariant SQL written before the
      seed change.
- [x] **UX Consistency** — WATUSI listing rendered via the same
      `RankingExercise.module.css` count chip style as iter5 (slimmed). The
      new `CoreStyleInfo` and `CoreStyleChecklist` files are **dispatcher
      wrappers** around the shared `InfoExercise` / `CheckboxExercise`
      primitives — they resolve the matched style and forward props to the
      existing component. No new UI primitives, no new styling vocabulary,
      no new interaction patterns introduced.
- [x] **Performance** — Per-style content is statically baked into the
      seed; render-time work is a single object lookup. No new network
      requests.
- [x] **IP Compliance** — All new info/checkbox rows carry the existing
      Target Training International attribution string. `ip-review.md`
      gains a §11 Iter-6 block before merge.

      **Documented deviation from Constitution §V** ("IP review BEFORE
      implementation begins"): iter6 follows the iter5 precedent, where
      the IP review (`ip-review.md` block + facilitator sign-off) occurs
      in the Polish phase (T082, T087) rather than before Phase 5 begins.
      Rationale: (a) all new content is transcribed verbatim from a
      single, already-approved upstream source (`psp_content.md` §HIGH
      D/I/S/C, lines 468–620), so the review surface is "did we copy it
      right and carry attribution?" rather than "is this content
      authorised?" — a post-implementation diff check is more accurate
      than a pre-implementation paper review. (b) The facilitator (Bijo
      Abraham) approved the same post-implementation cadence for iter5
      (commit `5e70a94`) out-of-band; this iteration extends the same
      content-source and the same review handler. (c) Merge of PR 2
      (content + migration) remains gated on §11 sign-off, so no
      unauthorised content reaches `main` regardless of when the review
      task fires within the local branch timeline. If a future iteration
      ever sources content from outside `psp_content.md`, the pre-
      implementation review gate MUST be reinstated.

## Project Structure

### Documentation (this feature)

```text
specs/006-iter6-personality-watusi-polish/
├── plan.md                       # This file
├── spec.md                       # Feature spec
├── research.md                   # Phase 0 — design decisions
├── data-model.md                 # Phase 1 — entity + JSONB shapes
├── contracts/                    # Phase 1 — public interface contracts
│   ├── ranking-read-only.md      # RankingExercise read-only contract
│   ├── personality-deep-dive.md  # New exercises + per-style content contract
│   ├── text-prompt-parser.md     # TextExercise prompt parser contract
│   └── migration-016.md          # Migration shape + idempotency invariants
└── quickstart.md                 # Manual walk-through
```

### Source touched

```text
src/components/exercise/
├── RankingExercise.tsx           # Add interaction='sorted' read-only mode
├── RankingExercise.module.css    # Slim count chip; remove # column when sorted
├── RankingExercise.test.tsx      # +3 tests (read-only, sorted, auto-complete)
├── TextExercise.tsx              # Adopt parseBlocks for prompt rendering
├── TextExercise.module.css       # ol/ul styles (mirror InfoExercise)
├── TextExercise.test.tsx         # +2 tests for prompt parser
└── CoreStyleDeepDive/            # NEW (see contracts)
    ├── CoreStyleInfo.tsx         # info-typed dispatcher for per-style content
    ├── CoreStyleChecklist.tsx    # checkbox dispatcher for per-style options
    └── coreStyleDeepDive.test.tsx

src/pages/course/
└── SectionPage.tsx               # Wire computed='core_style_section' info branch + checkbox branch

src/lib/
└── coreStyle.ts                  # Already exists (iter5). Add helper to pick block from sections_by_style/options_by_style.

db/
├── seeds/course-content.json     # Personality section: +4 new rows; -1 (my-core-style)
├── seeds/ip-review.md            # +§11 Iter-6 block
├── migrations/016_personality_deep_dive.sql       # Generated
├── tests/016_deep_dive_exercises_invariants.sql   # RED/GREEN invariants
└── tests/016_idempotency.sql                      # Idempotency test

scripts/
└── build-migration-016.ts        # Seed → migration emitter (mirror of build-migration-015.ts)

supabase/migrations/
└── 20260518000000_016_personality_deep_dive.sql   # Mirror of db/migrations/016
```

## Phases

### Phase 0 — Research

See `research.md`. Resolves:

- R1: Where in the slide-group sequence do the four deep-dive slides live?
  (After the existing four-profile read-through, before the section closing.)
- R2: How to dispatch per-style content from a single exercise row? Two
  options: (a) a new exercise type, (b) extend `info` / `checkbox` content
  with `sections_by_style` / `options_by_style` maps + a `computed` hint.
  Decision: option (b) — minimal type-surface change, mirrors iter5's
  `computed: 'core_style'` info pattern.
- R3: How to handle the `my-core-style` removal without orphaning iter5
  responses? Decision: keep the exercise row in the seed but set
  `order_index` past the closing slide and `slide_group` = `null` so it
  never renders. Responses preserved.
- R4: WATUSI ranking auto-complete-on-mount mechanism. Decision: on first
  render with `interaction: 'sorted'`, persist a synthetic `{order: derived}`
  response with `is_complete: true` so the slide-gate advances. Subsequent
  renders rely on the existing response.
- R5: Count chip positioning fix — currently the chip is `display: inline-
  flex` inside the row's `<li>`, but on long labels (HIGH-I has wraps) the
  chip wraps below and overlaps the sticky nav. Decision: pin the chip to
  the right end of the row via `margin-left: auto` and add `padding-bottom:
  var(--space-12)` to `.slideTrack` so any overflow content can scroll past
  the sticky `SlideNav`.
- R6: `TextExercise` prompt parser — extract `parseBlocks` from
  `InfoExercise.tsx` into a shared helper, or inline it? Decision: extract
  to `src/lib/markdownBlocks.ts` and re-use from both components.
- R7: Per-style content sourcing — store in seed (`sections_by_style`
  map) vs. fetch from `psp_content.md` at build time. Decision: bake into
  seed for runtime simplicity + offline correctness.

### Phase 1 — Design & Contracts

#### Data Model

See `data-model.md`. New JSONB shapes:

```ts
// info exercise (Characteristics / Ideal Env / Comfort Zones)
type CoreStyleSectionContent = {
  content: string                            // fallback if quiz answers missing
  computed: 'core_style_section'
  computed_inputs: [string, string]          // [q1_id, q2_id]
  sections_by_style: Record<'D'|'I'|'S'|'C', string>
}

// checkbox exercise (Characteristics Checklist)
type CoreStyleChecklistContent = {
  prompt: string
  allow_multiple: true
  computed: 'core_style_options'
  computed_inputs: [string, string]
  options_by_style: Record<'D'|'I'|'S'|'C', { id: string; label: string }[]>
}

// ranking exercise read-only mode
type SortedRankingContent = RankingContent & { interaction: 'sorted' }
```

#### Contracts

- `contracts/ranking-read-only.md` — props, gating behaviour, auto-complete-
  on-mount semantics, ARIA.
- `contracts/personality-deep-dive.md` — per-style content selection, fallback
  rendering when quiz answers missing, slide-group sequence change.
- `contracts/text-prompt-parser.md` — `markdownBlocks.parseBlocks` shape, line
  patterns (numbered, bulleted, paragraph, br), test matrix.
- `contracts/migration-016.md` — seed delta, idempotent UPSERT pattern,
  `my-core-style` preservation strategy, FK-cascade considerations for
  `responses` rows under removed/deprecated exercises.

#### Quickstart

See `quickstart.md`. Manual walk-throughs for the three user stories on a
local dev server.

## Complexity Tracking

| Concern | Why | Mitigation |
|---|---|---|
| `RankingExercise` gains a third interaction mode (`sorted` alongside `drag` and `buttons`) | The user's "items are to listed and not edited" requirement does not fit either existing mode; adapting drag-disabled would leak drag semantics into a11y tree. | Implement as a discriminated `interaction === 'sorted'` early-return branch — render-only path, no shared state with drag/buttons branches. |
| Per-style content stored in 4 separate exercise rows with map-keyed payloads | An alternative would be 16 rows (4 per style); 4 rows + map keeps seed size manageable and queries simple. | Document the schema in `contracts/personality-deep-dive.md`; back per-style payloads with TypeScript types in `src/types/database.ts`. |
| Auto-complete-on-mount writes a response without participant interaction | Required by FR-002 so the slide-gate advances without forcing the participant through a no-op click. | Document explicitly in `contracts/ranking-read-only.md`; mark the persisted response as derived (no `created_at` re-write on subsequent visits). |

## Risks

- **R-A**: A WATUSI ranking with `interaction: 'sorted'` but `derives_from`
  missing or a stale upstream response could show all zeros. Mitigation:
  fallback prompt + log warning to console in dev.
- **R-B**: The Characteristics Checklist persists ticks under a new
  exercise id, but iter5's `my-core-style` text response is orphaned. If
  the participant ever returns to a (hypothetical) "view all my answers"
  view, the orphaned response will appear. Mitigation: hide unrendered
  exercises from any future answers-summary surface.
- **R-C**: Migration 016 timing — must run AFTER 015 (iter5). Mitigation:
  filename ordering (`20260517` < `20260518`) + supabase migration framework
  enforces ordering.

## Open Questions

None at plan time. All clarifications captured in spec.md and research.md.

## References

- Iter5 plan: `specs/005-iter5-ux-fixes/plan.md`
- Iter4 plan (slide-nav): `specs/003-slide-nav-ux-rework/plan.md`
- Content source: `psp_content.md` §HIGH D/I/S/C (lines 468–620)
- Constitution: `.specify/memory/constitution.md`
