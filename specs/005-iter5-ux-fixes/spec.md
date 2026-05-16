# Feature Specification: Iteration 5 — UX Fixes (Navbar Collapse, Layout, Personality Quiz, Slide-State Reset)

**Feature Branch**: `005-iter5-ux-fixes`
**Created**: 2026-05-16
**Status**: Draft
**Input**: User description (excerpt):
> "005 of edits. 1. Make the navbar on the left minimizable and smooth. 2. There is unnatural spacing below each exercise section. Fix that. 3. In personality section, you are supposed to ask the two questions whether they are introverted or extroverted and whether they are people oriented or task oriented, the details of the DISC are to be a read through… Then it needs to show details like comfort zone and strengths, ideal env, characteristics etc of each. Read and click next sections. 4. On clicking Next Section at the end of personality it takes me to Attitudes but the options donot show 'next', it shows 'next session' instead. I think the next session button takes me to the end of the course instead of beginning. 5. The values section WATUSI count isnt updated, find the issue, if it's a slow to update issue, make a workaround locally so that it doesnt affect the user. If it's not the issue, then fix it. I cannot continue from Attitude cause of this bug. 6. The 'What is' explanation in each section doesnt take the full width it could to make a cleaner UI with sub parts like An attitude is 1. 2. 3. 4. being shown as 1. 2. in the first column and 3. 4. in the second column. Check psp_content.md if any doubts."

---

## Terminology

| User phrasing (from input) | Code / UI string | Where it lives |
|---|---|---|
| "next session" | **"Continue to next section →"** | `SectionClosingSlide.tsx:39,69` (the closing-slide Next button label) |
| "next" | **"Next →"** | `SlideNav.tsx:47` (default mid-section Next label) |
| "begin" | **"Begin →"** | `SectionPage.tsx:324` (intro-slide label) |
| "finish" / "end" | **"Finish course →"** | `SectionClosingSlide.tsx:31` (last-section closing) |

When the user input or this spec colloquially says "next session", treat it as the participant's reading of the **"Continue to next section →"** button. The code never contains the literal string "next session" — engineers searching for it will find nothing; grep for "next section" or "continue to next" instead.

---

## Background

Iteration 4 (`003-slide-nav-ux-rework`) introduced the slide-paced section page; Iteration 5 (`004-content-restructure`) reshaped content into three groups / nine sections with per-question answer fields. This iteration cleans up six concrete, in-the-wild UX issues surfaced during participant walkthroughs. None of them require schema work — five are pure UI/component bugs and one is a content reshape of the Personality section's DISC profiles (one new `radio-quiz` or reuse of existing `checkbox`-with-`allow_multiple:false` pattern + an info read-through). Everything is reversible at the seed and component level.

Together these fixes unblock the participant flow at two places (Personality → Attitudes hand-off and the WATUSI-derived counts inside Attitudes) and tighten visual polish in three more.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Participant can collapse the left navbar to widen the canvas (Priority: P2)

A participant working through a long-form exercise (e.g., Past Experience Inventory, Goal Achievement Plan) wants more horizontal room for their textareas and tables. They click a chevron on the left edge of the sidebar; the sidebar collapses smoothly to an icon-only rail (or fully hides), the main content reflows to fill the freed space, and the toggle remains visible so they can re-expand whenever they like. State persists across reloads.

**Why this priority**: A repeat ergonomic complaint, but participants can still complete every exercise without it. Lower than the slide-state bug (US3) which actually blocks progress.

**Independent Test**: From `/course`, click the sidebar's collapse toggle. Verify the sidebar transitions to its collapsed width within ~200 ms, the brand mark and nav icons remain visible (or the sidebar fully hides — see FR-001), the main content's `margin-left` shrinks in the same animation, and clicking again expands it. Reload the page; the previous state is restored.

**Acceptance Scenarios**:

1. **Given** the sidebar is expanded (default), **When** the participant clicks the collapse toggle, **Then** the sidebar animates to its collapsed width over 150–250 ms with no layout jump, and the main content's left margin animates in lockstep.
2. **Given** the sidebar is collapsed, **When** the participant reloads the page, **Then** the sidebar re-renders in its collapsed state (preference persisted in `localStorage`).
3. **Given** any sidebar state, **When** the participant hovers the toggle, **Then** the toggle exposes an `aria-label` describing the next action ("Expand sidebar" / "Collapse sidebar").
4. **Given** the viewport is below 768 px (mobile), **When** the participant loads any page, **Then** the sidebar collapse behaviour is unchanged from today's mobile hide (no regression).

---

### User Story 2 — Exercise slides don't carry phantom whitespace below their content (Priority: P2)

A participant scrolls to the bottom of a single-exercise slide (e.g., "What Is an Attitude?" info slide) and sees the section's previous/next nav appear roughly where the content ends — not floating ~200–400 px below it. The grid-stacked slide track no longer reserves height for hidden inactive slides.

**Why this priority**: Visual polish, no functional blocker. But the gap is noticeable enough that a participant described it as "weird empty space."

**Independent Test**: Visit any section. On any slide whose content is shorter than the tallest peer slide, measure the gap between the last exercise card and the SlideNav. The gap should equal the SectionPage's `padding-bottom` plus the SlideNav's `padding-top`; no other empty pixels should be present.

**Acceptance Scenarios**:

1. **Given** a participant on a slide whose active content is shorter than another slide in the same section, **When** the page is rendered, **Then** the slide track's height matches the active slide's height (not the tallest slide's height).
2. **Given** the participant advances to a taller slide, **When** the new slide becomes active, **Then** the page expands cleanly to fit the new content; the previously visible nav repositions without jumping more than the height delta.
3. **Given** a section with only one exercise on each slide, **When** the participant cycles through every slide, **Then** no slide leaves a > 24 px residual gap between its content and the nav.

---

### User Story 3 — Slide state resets when navigating between sections (Priority: P1) — BLOCKING

A participant finishes Personality (closing slide → "Continue to next section →") and lands on Attitudes. The Attitudes page opens at its **intro** slide (or, if a `progress.last_exercise_id` exists for Attitudes, at the resume slide). The Next button reads "Begin →" at the intro, "Next →" mid-section, and "Continue to next section →" only at the closing slide. The current bug — where the Attitudes page opens at the closing slide and the next click skips the whole section — is gone.

**Why this priority**: This is the immediate blocker called out in input #4 + #5: "I cannot continue from Attitude cause of this bug." Without fixing this, US4 of `004-content-restructure` regresses (sections after Personality become unvisitable in any sane order).

**Independent Test**: From Personality's closing slide, click "Continue to next section →". Verify the URL becomes `/course/attitude`. Verify the rendered slide is the intro slide (the opening quote + "Why this matters" + "Begin →" button). Verify clicking "Begin →" advances to slide 0 (the "What Is an Attitude?" info exercise). Verify the Next button label is "Next →" on slide 0 and "Continue to next section →" only on the closing slide.

**Acceptance Scenarios**:

1. **Given** a participant at Personality's closing slide, **When** they click "Continue to next section →", **Then** the Attitudes page loads with the intro slide active and the Next button labelled "Begin →".
2. **Given** a participant has a saved `progress.last_exercise_id` for Attitudes, **When** they revisit `/course/attitude`, **Then** the slide containing that exercise is the active slide (resume behaviour preserved).
3. **Given** a participant cycles Personality → Attitudes → back via browser-back → Personality, **When** they arrive at each section, **Then** the slide state is the freshly-derived initial slide for that section (not the leftover state from the previously-viewed section).
4. **Given** a participant uses the in-page "← Back to course" link from Attitudes' closing slide, **When** they revisit Attitudes, **Then** they see whichever slide their progress points at — never the leftover totalGroups index from a different section.

---

### User Story 4 — WATUSI count badges update live as the participant ticks attitude statements (Priority: P1) — BLOCKING

A participant on the Attitudes section ticks statements in the "Identifying Your Attitudes" exercise. The WATUSI ranking that follows (same slide group) shows count badges next to each of the six attitude rows; those badges update **instantly** as the participant ticks/unticks statements. The participant can complete the ranking (drag any row) and proceed.

**Why this priority**: Same blocker as US3 — the participant currently cannot complete the Attitudes section because they perceive the WATUSI counts as stale. Either the badges actually are stale (real bug) or they look stale (perception bug). Either way, fix or design around it.

**Independent Test**: On the Attitudes slide that hosts both `identifying-attitudes` and `attitude-types-watusi`, tick three W-group statements (`w_1`, `w_2`, `w_3`). Verify the count badge next to "W — The Theoretical Attitude" reads `3` within one animation frame of each tick. Untick one. Verify the badge reads `2`. The ranking order updates by tiebreak rule (see `useWatusiCounts.ts`).

**Acceptance Scenarios**:

1. **Given** an empty Attitudes slide, **When** the participant ticks an attitude statement, **Then** the corresponding WATUSI count badge increments within one render (≤ 32 ms — i.e., within two 60 Hz frames; target ≤ 16 ms) — without waiting for the Supabase round-trip.
2. **Given** a participant has ticked at least one statement and the WATUSI badges reflect the count, **When** they drag a ranking row, **Then** the saved order is the post-drag order and `progress.last_exercise_id` advances past the WATUSI exercise.
3. **Given** the participant unticks every statement, **When** the counts go back to zero, **Then** the WATUSI ranking row order falls back to the WATUSI default order (`w,a,t,u,s,i`) and the badges show `0` (or hide — see FR-040).
4. **Given** the participant reloads the page, **When** Attitudes re-loads from Supabase, **Then** the WATUSI badges show the persisted counts derived from the saved `identifying-attitudes` response.

---

### User Story 5 — Personality determines Core Style via two questions, then teaches DISC as a read-through (Priority: P2)

A participant on the Personality section answers exactly two binary questions: (Q1) Extroverted or Introverted? (Q2) People-oriented or Task-oriented? The system maps the answer pair to one of the four Core Styles (D / I / S / C) using the workbook's `Extroverted+Task = D`, `Extroverted+People = I`, `Introverted+People = S`, `Introverted+Task = C` rule. After the quiz, the participant reads through (info-style slides) the comfort zones, strengths, ideal environments, and characteristics of all four styles — not just their own. The current "HIGH D / HIGH I / HIGH S / HIGH C Core Style Profile" checkbox exercises are removed (they currently confuse participants who try to use the checkboxes as the Core-Style determination rather than as a self-affirmation checklist after the determination).

**Why this priority**: Content correctness vs. workbook. Not blocking — participants can complete the section today — but it diverges from `psp_content.md` lines 408–432 (the two-question Core Style method) and 449–462 (read-through for empathy with other styles).

**Independent Test**: Visit `/course/personality`. Verify after the DISC introduction info slide, the next exercise is a two-question quiz (radio-style, one selection per question). Verify the participant cannot advance past the quiz until both questions are answered. Verify the next slide shows the participant's mapped Core Style on a "Your Core Style: ___" card with a short summary. Verify subsequent slides present the four DISC profiles as info read-throughs (no per-statement checkboxes). Verify the People Reading exercise (`my-core-style` slug, `type='text'`) remains as a final single-textarea reflection.

**Acceptance Scenarios**:

1. **Given** a participant on the Personality section, **When** they finish reading the DISC introduction, **Then** the next exercise is the two-question quiz with exactly two prompts (Q1 + Q2), each with exactly two options.
2. **Given** the participant has answered both quiz questions as Extroverted + Task-oriented, **When** they advance, **Then** the next slide displays "Your Core Style: D — Dominance" (or equivalent) before they read the DISC profiles.
3. **Given** the participant has answered both quiz questions, **When** they navigate forward, **Then** they encounter four read-through info slides (one per Core Style) showing each style's strengths, ideal environment, characteristics, and comfort-zone notes — sourced from `psp_content.md` lines 466–747.
4. **Given** the participant changes their quiz answers after reading the profiles, **When** the Core-Style result card re-renders, **Then** the displayed Core Style updates to match the new answer pair.

---

### User Story 6 — "What is …" explanations span the full content width with a single-column reading flow (Priority: P3)

A participant reading a section's "What Is an Attitude?" / "What is a Role?" / "What is a Value?" info slide sees the explanation laid out as one column that uses the full available content width (up to the existing `--max-content` token). Numbered or bulleted sub-parts (e.g., "An attitude is: 1. … 2. … 3. … 4. …") render as a single vertical list, not as a 2-column grid that splits 1+2 left, 3+4 right.

**Why this priority**: Cosmetic. No participant is blocked; readability complaint only.

**Independent Test**: Visit `/course/attitude` → slide 0 ("What Is an Attitude?"). Inspect the `<ul>` / `<ol>` / `<p>` siblings rendered by `InfoExercise`. Verify no `column-count`, no `columns`, no `grid-template-columns` with > 1 column applies to the text container. Verify each numbered item occupies its own row at viewport widths from 320 px to 1440 px.

**Acceptance Scenarios**:

1. **Given** a participant on any info slide containing a numbered list, **When** the page renders, **Then** every numbered item appears on its own row in document order.
2. **Given** the slide's text container, **When** the participant inspects the computed CSS, **Then** the `column-count` is `auto` or `1` and `grid-template-columns` (if set on a parent) does not split the content vertically.
3. **Given** any viewport ≥ 1024 px, **When** an info slide renders, **Then** the text container's `max-width` matches the surrounding exercise card's content area (no narrower-than-card paragraph block).

---

## Functional Requirements

### Sidebar collapse (US1)

- **FR-001 — Sidebar collapse mode**: Sidebar MUST support a collapsed mode. Collapsed mode is **icon-only rail** at `--sidebar-collapsed-width` (≈56 px), retaining brand mark + nav icons + footer role pill. Full hide is *out of scope* for this iteration.
- **FR-002 — Toggle control**: A toggle button MUST be visible at the sidebar's top-right edge in both states with an `aria-label` reflecting the next action. Keyboard activation (`Enter`, `Space`) MUST work.
- **FR-003 — Animation**: Both sidebar width and the main shell's `margin-left` MUST animate over 150–250 ms with `cubic-bezier(0.22, 1, 0.36, 1)` (or the existing `--transition-base` token if it lands in that range). No layout jump.
- **FR-004 — Persistence**: Collapse state MUST persist to `localStorage` under the key `psp:sidebar:collapsed` (boolean) and rehydrate on next mount.
- **FR-005 — Mobile**: At viewport < 768 px the existing `display: none` rule wins; the collapse toggle does not appear.
- **FR-006 — Accessibility**: `aria-expanded` MUST be set on the toggle; `aria-controls` MUST point to the sidebar's `aside`.

### Exercise-slide spacing (US2)

- **FR-010 — Slide track height equals active slide height**: The `.slideTrack` container in `SectionPage.module.css` MUST size to the active slide only — not to `max(height of all slides)`. Inactive slides MUST be removed from the layout flow (not just visually hidden).
- **FR-011 — No padding-bottom drift**: `.slide` MUST NOT add bottom padding that exceeds `--space-4`. The previous `gap: var(--space-4)` between exercise cards is preserved within the slide but does not bleed below the last card.

### Slide-state reset across sections (US3)

- **FR-020 — Slide state resets on section change**: When `useParams().sectionSlug` changes, `SectionPage` MUST reset its slide state to the freshly-derived initial slide for the new section (intro slide if `framing` exists and no resume target, else slide 0). The mechanism MAY be a `key` on a wrapper component, an effect that calls `goTo(initialSlide)` on slug change, or moving slide state into a child component keyed by `sectionSlug`. Implementation MUST NOT break Iteration 4's resume behaviour (FR-007 of `003-slide-nav-ux-rework`).
- **FR-021 *(preserved from Iter 4; regression guard)* — Next-button label reflects current slide**: When `isAtIntro` is true the button reads `Begin →`; mid-section it reads `Next →`; at closing it reads `Continue to next section →` (or `Finish course →` for the last section). Not a new requirement — the FR-020 / FR-022 slide-state fix MUST NOT regress this behaviour. Already implemented at `SectionPage.tsx:323` in Iter 4.
- **FR-022 — Initial slide is computed against current data, with reset on section change**: The `useSlideState` hook's current `useMemo(..., [])` empty-deps quirk that freezes `initialSlide` before data loads MUST be replaced with a **lazy `useState` initializer** (`useState(() => deriveInitialSlide(args))`) **plus a `useEffect` keyed on `[resetKey, slideGroups.length]`** that calls `setCurrentSlide(deriveInitialSlide(args))` whenever the section changes and data is ready. Per `research.md §R6` (R6 picked option (b) — effect-driven reset — over (a) key-remount or (c) lazy init alone). The `resetKey` parameter is caller-provided (typically the section slug). Full contract in `contracts/slide-state.md`.

### WATUSI count freshness (US4)

- **FR-030 — WATUSI counts derive synchronously from local responses**: `RankingExercise` MUST recompute counts on every render where the upstream `derivesFromResponse` reference changes. Today's `useMemo(computeDerivedOrder, [content, derivesFromResponse])` already does this — but the count badges' input chain (SectionPage `responses` state → `derivesFromResponse` prop → RankingExercise's `derived.counts`) MUST be verified end-to-end with a test.
- **FR-031 — Optimistic local cache must include count source**: The `LocalResponseUpdateContext` updater (currently wired in `SectionPage.tsx:127`) MUST write the upstream exercise's response into `responses` state *before* the Supabase upsert resolves, so `RankingExercise` sees the new counts within the same React commit. This is already the current implementation; this iteration validates it with a test and surfaces the count badge regardless of whether the upstream response has reached Supabase yet.
- **FR-032 — Stale-count workaround (fallback)**: If, despite FR-030 + FR-031, the count badges still appear stale to the participant (e.g., the upstream `checkbox` debounce of 300 ms creates a perception lag), the iteration MUST add a synchronous count derivation directly inside `CheckboxExercise` → context → `RankingExercise` (or a sibling shared state) so the badge updates within ≤ 32 ms of the click, independent of any save() debounce.
- **FR-033 — Slide-gate not blocked by perceived staleness**: The slide-gate that decides whether the participant can advance past the WATUSI slide MUST consider the WATUSI exercise (a `ranking` exercise) complete once any drag occurs *or* the initial derived order is non-empty (current behaviour via `is_complete=true` on first save). The participant MUST be able to reach Values from Attitudes after at least one drag of the WATUSI ranking.
- **FR-040 — Zero-count badge presentation**: When a WATUSI group's count is zero, the badge MAY be hidden or rendered as `0`; choice is recorded in `research.md §R5`.

### Personality two-question quiz + DISC read-through (US5)

- **FR-050 — Two-question Core Style quiz**: Per `research.md §R1`, the quiz is implemented as **two consecutive `checkbox` exercises with `allow_multiple: false`, sharing `slide_group: 2`** in the Personality section, immediately after `disc-introduction`:
  - `core-style-q1-extroversion` (Question 1: Extroverted vs. Introverted)
  - `core-style-q2-orientation` (Question 2: People-oriented vs. Task-oriented)

  No new exercise type is introduced. Both exercises MUST be complete (`is_complete=true`) before the slide gate allows `canGoNext`. Full row contract in `contracts/personality-exercises.md` Rows 2–3.
- **FR-051 — Core-Style mapping**: After both questions are answered, the next slide (or a result card on the quiz exercise itself) MUST display the participant's Core Style mapped by: `E+T→D`, `E+P→I`, `I+P→S`, `I+T→C`. The mapping logic lives client-side in `src/lib/coreStyle.ts` (NEW).
- **FR-052 — Four read-through profiles**: Four new info exercises (one per Core Style) MUST present the strengths / ideal environment / characteristics / comfort zone content from `psp_content.md` lines 466–747 as **read-through prose**, not checkbox lists. The current four `disc-core-style-{d,i,s,c}` checkbox exercises MUST be removed (or converted to info type — see contracts).
- **FR-053 — People Reading exercise preserved**: The current `my-core-style` exercise (`type='text'`, single textarea, `attribution: null`, `is_scored: false` — the participant reflection prompt that asks them to articulate their Core Style and how it shows up) MUST remain in place at the end of the section. `content_json` is byte-identical; only `order_index` (7 → 9) and `slide_group` (NULL → 6) may shift. The reflection now consumes the two-question quiz result rather than the legacy `identifying-personal-style` checkbox totals.
- **FR-054 — Seed regeneration**: The seed change MUST be re-derived from `psp_content.md` (consistent with `004-content-restructure`'s seed-from-canonical-content rule). All attribution lines from `(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)` MUST be preserved.
- **FR-055 — No participant data loss for unaffected sections**: This seed change only mutates the Personality section's exercise rows. Migration MUST scope its DELETE to `exercises WHERE section_id = (SELECT id FROM sections WHERE slug='personality')` and re-INSERT the new exercise rows. `responses` rows tied to removed Personality exercises are wiped (consistent with `004-content-restructure`'s pre-production wipe stance — confirmed by user on 2026-05-15 and again on 2026-05-16; same precedent).

### "What is" layout (US6)

- **FR-060 — Single-column info text**: The `InfoExercise` text container (`.text` in `InfoExercise.module.css`) MUST NOT apply CSS multi-column (`column-count`, `columns`) or any `grid-template-columns` value that splits the prose into more than one column. If a parent container (e.g., `.exerciseBody` in `SectionPage.module.css`) currently applies a multi-column rule, that rule MUST be unset for `InfoExercise` content via a scoped selector.
- **FR-061 — Full content-area width**: The text container MUST stretch to the exercise card's inner content width (i.e., `width: 100%` within the card's padding). Existing `--max-content` constraint at the page level is preserved.
- **FR-062 — Numbered-list formatting**: Numbered or bulleted lines from `content.content` (currently split on `\n` and each line wrapped in `<p>`) MAY render as a `<ol>` / `<ul>` for semantic correctness, but at minimum each `<p>` MUST be a block-level element that occupies its own row.

---

## Edge Cases & Risks

- **Sidebar collapse + active route highlight**: Active-route highlight uses `background: var(--color-trust-light)`. In collapsed mode the icon must still receive the highlight (visible at icon scale). Verify keyboard focus indicator remains visible.
- **Slide-state reset + back-button**: The fix MUST NOT cause the section page to lose unsaved input when the user uses browser-back. Since exercises debounce-save on every change, browser-back from Attitudes → Personality SHOULD restore Personality at its closing slide (the slide that was active when they navigated forward), which means resetting on `sectionSlug` change re-derives `initialSlide` — `progress.last_exercise_id` for Personality may have advanced to the closing slide proxy or the final exercise; verify both cases in `quickstart.md §US3`.
- **WATUSI perception bug**: If the actual root cause is the slide-state regression (US3) — i.e., the participant was looking at the WATUSI slide thinking it was the Attitudes intro and never saw the upstream `identifying-attitudes` slide — then fixing US3 alone may resolve US4. The contracts MUST validate both hypotheses before patching `RankingExercise`. (If US3 alone fixes it, FR-032's workaround is no-op.)
- **Personality content rewrite + Iteration 4 testimonials hook**: The Personality section's closing slide testimonial-eligibility check (`progress.completed` for the section) keys off `is_complete` on each exercise. New info exercises auto-complete on render; the new two-question quiz exercise MUST flip `is_complete=true` once both questions are answered, matching the pattern of existing `checkbox(allow_multiple: false)` completion.
- **`InfoExercise` width fix scope**: If the unwanted columns turn out to be applied by a global `.prose` or shell-level class (rather than by InfoExercise itself), the fix must be scoped narrowly to not change Recharts or table-rich slides. Audit in `research.md §R3`.

---

## Out of Scope

- Schema changes — none. No new columns, no new tables, no migration file beyond what FR-055 requires (a small content-only mutation to Personality exercises).
- New exercise types — the quiz reuses `checkbox` with `allow_multiple: false`, optionally extended to two prompt+options pairs via a small renderer tweak, or splits into two single-prompt `checkbox` exercises sharing a `slide_group`. Justified in contracts.
- Mobile redesign — out of scope; the sidebar's mobile-hidden behaviour is preserved unchanged.
- DISC quiz scoring — none beyond the deterministic E/I × P/T mapping.
- The Attitudes / Values / Roles / Skills / Goal-Setting / Strategic-Planning content — no edits beyond fallout from the slide-state and WATUSI fixes.
- Animation library — no new dep; CSS-only transitions throughout.

---

## Assumptions

- **A1**: User confirmed `005-iter5-ux-fixes` is a new feature branch (not an amendment to 004). Confirmed via AskUserQuestion 2026-05-16.
- **A2**: The product is still pre-production with no real user responses to preserve. Wiping `responses` for the four removed `disc-core-style-{d,i,s,c}` exercises (FR-055) is acceptable.
- **A3**: The "navbar on the left minimizable" interpretation is **icon-rail collapse**, not full-hide. If user prefers full-hide, FR-001 changes; the plan flags this for clarification in research.
- **A4**: WATUSI staleness is *likely* a perception artefact of the US3 slide-state regression (participant didn't realise they were on the WATUSI slide already), not an actual missed render. Validated in research before patching `RankingExercise`.

---

## Success Criteria

- **SC-1** (US1): Sidebar collapses + re-expands within 250 ms on a baseline laptop; preference persists across reloads; passes the visual-test checklist in `quickstart.md §US1`.
- **SC-2** (US2): The vertical distance between an info slide's last line and the SlideNav is ≤ `var(--space-6)` (≈ 48 px) on every section, measured in DevTools at 1280 × 800.
- **SC-3** (US3 — BLOCKING): Personality → Attitudes hand-off lands on Attitudes' intro slide with "Begin →" label; verified by `SectionPage.test.tsx` and by a manual walkthrough in `quickstart.md §US3`.
- **SC-4** (US4 — BLOCKING): WATUSI count badges update within one animation frame of a tick; participant can drag the ranking and complete the slide; verified by a Vitest re-render assertion and a manual walkthrough.
- **SC-5** (US5): Personality section presents a two-question quiz followed by four info read-through slides; Core Style maps deterministically per the E/I × P/T rule; old checkbox exercises are removed from the seed.
- **SC-6** (US6): No info slide renders its prose in a multi-column layout at any viewport from 320 px to 1440 px.
- **SC-PERF-1**: No bundle delta > 1.5 KB gzipped (only CSS + small TS for collapse state + small lib for Core Style mapping).
- **SC-IP-1**: All `(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)` lines preserved on the new info exercises.

---

## References

- **Canonical content**: `psp_content.md` lines 408–432 (two-question method), 466–747 (DISC profiles read-through)
- **Prior plan (slide-nav)**: `specs/003-slide-nav-ux-rework/plan.md`
- **Prior plan (content)**: `specs/004-content-restructure/plan.md`
- **Constitution**: `.specify/memory/constitution.md`
