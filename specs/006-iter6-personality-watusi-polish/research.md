# Research — Iter6 Personality Deep-Dive + WATUSI Sorted Listing

Each entry: **Decision** / **Rationale** / **Alternatives considered**.

## R1 — Where do the four deep-dive slides live in the slide-group sequence?

**Decision**: After the existing four-profile read-through (`disc-profile-d/i/s/c` at slide_groups 4–5 in iter5), before the section-closing slide. New `slide_group` values 7, 8, 9, 10 (the `my-core-style` slot at SG 6 is reclaimed; see R3).

**Rationale**: The user's wording — "Then the next 4 slides go through the Characteristics, Ideal Environment, and Some points about them" — places the deep-dive AFTER the read-through ("then"). Keeping all four profile slides preserves the iter5 educational intent (participant sees all four styles to ground the framework) while adding personalised depth on top.

**Alternatives considered**:
- Replace the four-profile read-through entirely with the matched-style deep-dive (rejected — user clarified to keep both).
- Interleave the deep-dive into the read-through (skipped — adds slide-group complexity and breaks the existing iter5 sequence).

## R2 — How to dispatch per-style content from a single exercise row?

**Decision**: Extend the existing `info` and `checkbox` content shapes with optional `sections_by_style` / `options_by_style` maps + a `computed: 'core_style_section'` (info) or `computed: 'core_style_options'` (checkbox) hint. `SectionPage`'s render branch resolves the matched style via `resolveCoreStyleFromResponses` (already exists from iter5) and picks the right block.

**Rationale**: Avoids introducing a new exercise type, mirrors iter5's `computed: 'core_style'` info pattern (which substitutes `{result}` from a static template), keeps the data-model surface tight.

**Alternatives considered**:
- Sixteen exercise rows (4 per style) with slide-group filtering via a `visible_when` predicate — heavyweight, requires a new gating system.
- A new `dynamic_info` / `dynamic_checkbox` type — bigger type-surface change, no benefit over the map approach.

## R3 — How to handle removal of `my-core-style` without orphaning iter5 responses?

**Decision**: Keep the `my-core-style` row in the seed but set `slide_group = NULL` AND increase its `order_index` past every other Personality row, ensuring `groupExercisesBySlide` excludes it from the rendered slide track. The exercise still exists for FK integrity; existing responses persist.

**Rationale**: `responses.exercise_id → exercises.id` is `ON DELETE RESTRICT` (per migration 004). Deleting the row would either cascade-delete iter5 responses or fail the migration outright. Hiding via `slide_group=NULL` keeps the data clean.

**Alternatives considered**:
- Hard delete + explicit `DELETE FROM responses WHERE exercise_id = (...)` first (rejected — destroys iter5 participant data).
- Soft-delete column added to `exercises` table (rejected — schema change for one-off hide).

## R4 — WATUSI auto-complete-on-mount mechanism

**Decision**: On first render of a `RankingExercise` where `interaction === 'sorted'` AND no existing response exists for the participant, the component calls `save({ order: derivedOrder }, true)` once. Subsequent renders skip the persist (the response already exists and is hydrated through `initialResponse`).

**Rationale**: FR-002 requires the slide-gate to advance without manual interaction. The slide-gate reads `responses[exerciseId].is_complete`; the only way to flip that flag is to persist a response.

**Alternatives considered**:
- Special-case `groupComplete` in `useSlideState` to treat `interaction === 'sorted'` as auto-complete without a persisted response (rejected — leaks ranking-mode knowledge into the slide-state hook, which is otherwise content-agnostic).
- Render the WATUSI listing as an `info`-typed exercise (rejected — loses count chip rendering + count derivation, and we'd duplicate logic).

## R5 — Count chip positioning fix

**Decision**: Pin the count chip to the right end of each row via `margin-left: auto` inside the row's flex layout (it already is — confirmed via inspection). Remove `position: absolute` if present. Then add `padding-bottom: var(--space-12)` to `.slideTrack` so the last row + chip clear the sticky `SlideNav`. The "draggable" idea the user suggested is unnecessary once the chip stays inline.

**Rationale**: The user's wording "would be nice to make it draggable" was a workaround proposal — they identified the symptom (badge floating over the Next button) and asked for any reasonable fix. Inline-flow keeps the a11y tree predictable.

**Alternatives considered**:
- Make the count chip draggable via `@dnd-kit` (rejected — accessibility nightmare for what is fundamentally a display element).
- Float the chip to the left and the row label to the right (rejected — breaks reading order).

## R6 — `TextExercise` prompt parser

**Decision**: Extract `parseBlocks` from `InfoExercise.tsx` into `src/lib/markdownBlocks.ts` and import from both components. Add unit tests in `src/lib/markdownBlocks.test.ts`.

**Rationale**: DRY. Both components need the same numbered/bulleted line behaviour. Centralising the parser also gives us one place to extend if we later add headers, links, etc.

**Alternatives considered**:
- Inline the parser in `TextExercise.tsx` (rejected — divergence risk).
- Adopt a markdown library like `remark` (rejected — adds 30 KB+ for a 30-line use case).

## R7 — Per-style content sourcing

**Decision**: Bake content into the seed JSON. Source verbatim from `psp_content.md` §HIGH D/I/S/C (lines 468–620). One copy in the seed; no runtime fetch.

**Rationale**: Performance + offline correctness + simpler tests. The content does not change without a content review pass, which would update the seed anyway.

**Alternatives considered**:
- Fetch `psp_content.md` at build time and inject (rejected — adds a build step and a parsing layer).
- Store content rows in a separate `psp_content` table (rejected — schema growth for static data).

## R8 — `interaction: 'sorted'` opt-in design

**Decision**: New literal `'sorted'` joins `'drag' | 'buttons'`. Backward-compatible: existing seed rows default to their current `interaction`. New WATUSI seed sets `interaction: 'sorted'`. The `RankingExercise` component switches early on the value to a read-only render branch.

**Rationale**: Discrete, opt-in, zero risk to non-WATUSI ranking exercises. Future-proofs other read-only rankings.

**Alternatives considered**:
- Boolean `read_only` flag on the existing `RankingContent` (rejected — conflicts with the component's `readOnly` prop which means "disable interaction during review").
- Reuse `derives_from` presence as the read-only signal (rejected — coupling two orthogonal concerns).
