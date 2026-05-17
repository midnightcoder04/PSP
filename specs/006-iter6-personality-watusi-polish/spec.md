# Feature Specification: Iter6 — Personality Deep-Dive, WATUSI Sorted Listing, Power-Points Formatting

**Feature Branch**: `006-iter6-personality-watusi-polish`
**Created**: 2026-05-16
**Status**: Draft
**Input**: User description (verbatim):

> 1. The only two questions in section of personality should whether they are
>    Predominanty extrovert or introverted, and second slide whether they are
>    people oriented or task oriented. The following slide should show based on
>    the choice whether they are a HIGH D, HIGH I, HIGH S, or a HIGH C. Then
>    the next 4 slides go through the Charactericts, Ideal Environment, and
>    Some points about them. There is no need for any reaction from their side
>    but they can optionally checklist the specific character they are if HIGH
>    I, then characters of HIGH I checklist and that only. This information
>    should be stored in db for the person as well. No need to write the Core
>    style section at the end.
> 2. The six attitude types — WATUSI subsection does not auto arrange based on
>    count. I want it to be arranged (sorted) based on highest count of W, A,
>    T, S, U, I to the lowest when I click next from the exercise Identifying
>    your skills section. EXERCISE: Attitude Power Points — Reflection section
>    should have the text with "1. An attitude…" in the next line, 2. in the
>    next line, 3 in the next and such.
> 3. The items are to listed and not edited. There is no need for a # column.
>    The number column doesn't require that much space. And the budget
>    floating is hiding the next button, would be nice to make it draggable or
>    a better way as you seem fit.

**Clarifications captured up front** (resolved before spec freeze):

- **Personality deep-dive scope** — *Keep all 4 profile read-throughs AND add
  matched-style deep-dive*: the iter5 four-profile read-through stays
  unchanged; the four new deep-dive slides apply ONLY to the participant's
  matched core style.
- **"Budget floating" identification** — the count badge on each WATUSI
  ranking row, which floats right inside the row and (on shorter viewports)
  was being overlapped by the sticky `SlideNav` Next button.
- **WATUSI ranking mode** — replace the editable drag/buttons interaction with
  a *read-only sorted listing*, auto-sorted by checklist counts (W/A/T/U/S/I
  tiebreak), highest first. Drop the # rank column. Slim the count chip.
  Auto-completes on slide entry so the gate advances without manual reorder.
- **`my-core-style` final text question** — REMOVE.
- **Power Points reflection formatting** — generalize the existing
  `InfoExercise` numbered/bulleted line parser to also apply to the
  `TextExercise` *prompt* rendering, so the six-numbered list reads as a
  vertical list instead of one run-on paragraph.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — WATUSI ranking becomes a sorted listing the participant cannot edit (Priority: P1)

After ticking the WATUSI attitudes checklist, the participant clicks Next.
The next slide shows the six attitude types **already sorted** by their
checklist counts, top to bottom (W, A, T, U, S, I tiebreak on equal counts).
There are no drag handles, no up/down buttons, no `#` rank column. Each row
shows the attitude label and a slim count chip on the right. The slide
auto-completes so the gate advances on click of Next.

**Why this priority**: This is the participant-reported blocker — currently
the ranking does not reflect their counts (we just patched the count badge
field-name bug; this story removes the manual-reorder UX that prompted the
user's "items are to listed and not edited" instruction). Without this, the
Attitudes section's slide-gate cannot reliably advance, and the participant
spends time on a manual-reorder UI they did not ask for.

**Independent Test**: Open Attitudes section, tick a known distribution
(e.g. 5 W, 3 A, 1 I) on the `identifying-attitudes` checklist, click Next.
The WATUSI slide displays rows in order **W (5), A (3), I (1), T (0), U (0),
S (0)** with no drag handles and no `#` column. Click Next again — slide
advances.

**Acceptance Scenarios**:

1. **Given** a participant on the Identifying-Your-Attitudes slide who has
   ticked options spanning multiple WATUSI groups, **When** they click Next,
   **Then** the WATUSI ranking slide renders all six attitude rows sorted by
   their group counts (W/A/T/U/S/I tiebreak) and the count chip on each row
   shows the live count.
2. **Given** the participant later returns to the checklist and changes their
   ticks, **When** they navigate forward to the WATUSI slide again, **Then**
   the ranking re-sorts to reflect the new counts (no stale saved order
   persists).
3. **Given** the participant lands on the WATUSI slide, **When** the slide
   renders, **Then** there is no `#` rank column and no drag/reorder controls.
4. **Given** the WATUSI slide is the current slide, **When** the participant
   clicks Next, **Then** the slide-gate advances (no manual completion
   action required).

---

### User Story 2 — Floating count badge no longer overlaps the Next button (Priority: P1)

The count badge on each WATUSI row sits inline with the row content — never
covering the sticky `SlideNav` Next button at the viewport bottom, on any
supported viewport.

**Why this priority**: Reported by the participant ("the budget floating is
hiding the next button"). A blocking UX defect — the participant could not
see the Next button when the badge overlapped it.

**Independent Test**: Render the WATUSI slide at 1280×800 and 375×667. The
count chip on each row stays inside the row card. The sticky Next button is
fully visible at all times.

**Acceptance Scenarios**:

1. **Given** the WATUSI ranking slide is rendered on a 375-wide viewport,
   **When** the slide is scrolled to the bottom, **Then** the sticky Next
   button is fully visible and clickable.
2. **Given** the WATUSI ranking slide is rendered, **When** the count chip
   is inspected via dev tools, **Then** it has `position: static` (no
   floating/absolute positioning) and sits inside the row's flex layout.

---

### User Story 3 — Personality section gains a four-slide matched-style deep-dive (Priority: P2)

After the participant takes the two-question quiz and reads through the
four DISC profile slides (iter5 design), the next four slides go through the
deep-dive content for ONLY their matched core style: Characteristics, Ideal
Environment, Characteristics Checklist (optional, persisted), and Comfort
Zones. The "My Core Style" final text question is removed.

**Why this priority**: Content depth requested by the participant. Without
US1 and US2 above, the Personality section's flow is broken for downstream
sections, so this is P2 (important but not blocking).

**Independent Test**: Take the quiz, choose Extrovert + Task → resolves to D.
After the four read-through slides, the next four slides show ONLY the HIGH-D
content. Tick a few items on the HIGH-D Characteristics Checklist, advance,
return — the ticked items remain. No "My Core Style" text exercise appears.

**Acceptance Scenarios**:

1. **Given** the participant has answered both quiz questions and resolved
   to HIGH D, **When** they advance past the four-profile read-through,
   **Then** they see four additional slides containing only HIGH-D content
   (Characteristics, Ideal Environment, Characteristics Checklist, Comfort
   Zones).
2. **Given** the participant resolved to HIGH I, **When** they advance past
   the four-profile read-through, **Then** they see ONLY HIGH-I deep-dive
   slides (no HIGH-D / HIGH-S / HIGH-C deep-dive content is shown).
3. **Given** the participant is on the matched-style Characteristics
   Checklist slide, **When** they tick some characteristics, **Then** the
   ticks are persisted to the database and the slide-gate is NOT blocked
   on having any ticks (optional input).
4. **Given** the participant has resolved to a style, **When** they reach the
   end of the Personality section, **Then** there is no "My Core Style" text
   exercise — the section ends after the Comfort Zones slide (and any
   section-closing slide).
5. **Given** the participant has not yet answered both quiz questions,
   **When** they attempt to view the deep-dive slides, **Then** the slides
   display a friendly fallback message ("Answer the two questions above to
   see your matched style.") instead of erroring.

---

### User Story 4 — Power Points reflection prompt reads as a vertical list (Priority: P3)

The `attitude-power-points` text exercise's prompt — currently rendered as
one run-on paragraph — renders each `1. … 2. … 3. …` item on its own line,
as a semantic ordered list.

**Why this priority**: Pure polish. Affects readability but does not block
progression.

**Independent Test**: Open the Attitudes section, advance to the Power
Points slide. The six numbered Attitude Power Points display as six
separate list items, not as one paragraph with inline numbers.

**Acceptance Scenarios**:

1. **Given** a `TextExercise` whose prompt contains lines beginning with
   `1.`, `2.`, `3.`, …, **When** the prompt renders, **Then** each numbered
   line appears as its own `<li>` in an `<ol>`, mirroring the existing
   `InfoExercise` parser behaviour.
2. **Given** a `TextExercise` whose prompt contains both narrative text and
   numbered items, **When** the prompt renders, **Then** the narrative
   paragraphs render as `<p>` blocks and the numbered run renders as an
   `<ol>`.

---

## Functional Requirements

- **FR-001**: The `attitude-types-watusi` ranking exercise MUST render as a
  read-only sorted listing (no drag, no up/down buttons, no `#` rank column),
  sorted by `deriveWatusiCounts(checked).desc, W/A/T/U/S/I tiebreak`. On the
  FIRST render where `interaction='sorted'` AND no existing response is
  present, the component MUST persist `{order: derivedOrder, is_complete:
  true}` exactly once, so the slide-gate advances without manual
  interaction. Subsequent renders MUST NOT re-persist.
- **FR-002**: *(merged into FR-001)*
- **FR-003**: The WATUSI ranking exercise MUST re-derive its order from the
  upstream `selected_ids` every time `derivesFromResponse` changes — no
  saved-order branch wins over derived order in the read-only mode.
- **FR-004**: The count chip on each WATUSI row MUST be `position: static`
  (inline-flow) and MUST NOT overlap the sticky `SlideNav` Next button on
  any viewport ≥ 320 px wide.
- **FR-005**: The `TextExercise` MUST parse its `content.prompt` using the
  same numbered/bulleted line parser as `InfoExercise.parseBlocks`,
  rendering numbered runs as `<ol>` and bulleted runs as `<ul>`.
- **FR-010**: The Personality section MUST add four new slides after the
  existing four-profile read-through (D, I, S, C), each driven by the
  participant's resolved core style:
  - `core-style-characteristics` (info)
  - `core-style-ideal-environment` (info)
  - `core-style-traits-checklist` (checkbox, `allow_multiple: true`, optional)
  - `core-style-comfort-zones` (info)
- **FR-011**: Each new deep-dive exercise MUST carry per-style content in a
  `sections_by_style` (info) or `options_by_style` (checkbox) map keyed by
  `D | I | S | C`, with `computed: 'core_style_section'` and `computed_inputs`
  referencing the two quiz exercises.
- **FR-012**: When the participant has answered both quiz questions, each
  deep-dive slide MUST render ONLY the content block keyed to the resolved
  style. When either quiz answer is missing, the slide MUST render a
  fallback prompt directing the participant back to the quiz.
- **FR-013**: The matched-style Characteristics Checklist response MUST
  persist to the database as a normal `checkbox` response (one row per
  participant, keyed on the new exercise's id) — independent of the upstream
  quiz answers. Ticks are not required for slide-gate advancement (optional
  input). The optional-gate rule MUST be scoped narrowly: it applies ONLY
  to checkbox exercises whose `content_json.computed === 'core_style_options'`.
  Other `is_scored=false` checkboxes (now or later) retain the standard
  gating contract (requires a saved response).
- **FR-014**: The `my-core-style` text exercise MUST be removed from the
  Personality section seed and migrated out (responses retained for
  participants who answered in iter5 — preserved but un-rendered).
- **FR-015**: Section IP attribution (Target Training International) MUST
  be carried on every new info row added by this iteration; the new
  checklist row (`core-style-traits-checklist`) MUST also carry it.
- **FR-016**: A new migration (`016_personality_deep_dive.sql`) MUST be
  idempotent and generated from the seed via `scripts/build-migration-016.ts`
  using the same single-source-of-truth pattern as migration 015.
- **FR-017**: Removing `my-core-style` from the rendered slide track MUST
  NOT cascade-delete participant responses for that exercise. The migration
  MUST soft-hide the row by setting `slide_group = NULL` and
  `order_index = 99` so it is excluded from `groupExercisesBySlide` while
  preserving FK integrity for prior iter5 responses. The row MUST NOT be
  DELETEd, and responses MUST NOT be touched.

## Success Criteria

- **SC-001**: 100% of new Personality deep-dive slides render the correct
  per-style content for all four resolutions (D, I, S, C).
- **SC-002**: 100% of WATUSI ranking slides render with no drag handles,
  no `#` column, and correctly sorted rows when given a non-trivial count
  distribution.
- **SC-003**: Migration `016_personality_deep_dive.sql` is idempotent
  (running twice produces the same result; running once on a fresh DB
  produces the same final state as running it on a DB that already has
  iter5's migration 015 applied).
- **SC-004**: Vitest + RTL coverage. The canonical test-file layout for
  iter6 is:
  - `src/components/exercise/RankingExercise.test.tsx` — read-only sorted
    mode, no-rank-column, auto-complete-on-mount.
  - `src/components/exercise/TextExercise.test.tsx` — numbered/bulleted
    prompt parser.
  - `src/lib/markdownBlocks.test.ts` — shared parser unit tests.
  - `src/lib/coreStyle.test.ts` — `pickStyleBlock` unit tests (existing
    file gains new cases).
  - `src/components/exercise/CoreStyleInfo.test.tsx` — info dispatcher
    incl. per-style render + missing-answer fallback.
  - `src/components/exercise/CoreStyleChecklist.test.tsx` — checkbox
    dispatcher incl. per-style options + missing-answer fallback.
- **SC-005**: All iter5 baseline Vitest tests (commit `5e70a94`, 234
  passing / 52 skipped) remain GREEN. The post-iter6 total MUST be
  ≥ 234 + Δ; the actual Δ is recorded in the implementation commit
  message.
- **SC-006**: Lighthouse on `/course/personality` after iter6 stays within
  ±5 of the iter5 baseline.

## Constraints

- **No breaking changes** to the iter5 contract for the two quiz exercises
  (`core-style-q1-extroversion`, `core-style-q2-orientation`), the result
  exercise (`core-style-result`), or the four profile-read-through info
  exercises (`disc-profile-{d,i,s,c}`).
- **IP** — All new Personality content sourced verbatim from
  `psp_content.md` §HIGH D/I/S/C sections (lines 468–620 approx.). Every
  new exercise row carries the Target Training International attribution.
- **Performance** — TTI on `/course/personality` MUST remain ≤ 3 500 ms.
- **a11y** — The read-only WATUSI listing MUST set `role="list"` and remove
  `aria-grabbable` / drag-related ARIA. Each row is `role="listitem"` with
  a descriptive label.

## Non-Goals

- Re-introducing a personality "facilitator notes" view, an explainer for
  the DISC science, or any narrative copy beyond what's in `psp_content.md`.
- Animating the WATUSI sort transition (treat as static on each render).
- Allowing the participant to **manually override** the WATUSI sort. (US1
  explicitly rules this out — "items are to listed and not edited".)
- Migrating prior `my-core-style` participant responses into the new
  Characteristics Checklist (different exercise, different data shape).
