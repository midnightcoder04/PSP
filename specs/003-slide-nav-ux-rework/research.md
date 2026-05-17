# Phase 0 Research — Slide Navigation + Exercise UX Rework + Testimonials

**Feature**: Iteration 4 — `003-slide-nav-ux-rework`
**Date**: 2026-05-15

Each decision lists what was chosen, the rationale, and the alternatives considered. Decisions reference the user-direction prompt of 2026-05-15.

---

## R1 — Slide transition mechanism

**Decision**: Pure CSS `transform: translateX(-100% * currentSlide)` on a flex track inside `overflow: hidden`. No carousel library.

**Rationale**: The interaction is strictly sequential — back navigation is free, forward navigation is gated. None of the features a carousel library brings (looping, autoplay, swipe momentum, parallax) are wanted; some (swipe-skip-ahead) are anti-features here. A single CSS `transition: transform 250ms ease` paired with `useState(currentSlide)` is < 1 KB of code.

**Alternatives considered**:
- **`framer-motion` `AnimatePresence`** — adds ~30 KB gz for the transition aesthetics. Rejected.
- **`embla-carousel-react`** — ~9 KB gz, but designed around free-form swiping which conflicts with the completion-gate semantics. Rejected.
- **One route per slide** (`/course/personality/exercise/2`) — gives deep-linking but adds router complexity, history pollution, and back-button confusion. Rejected for this iteration; resume position is handled via `progress.last_exercise_id` instead.

---

## R2 — `reading_material` field shape on `SectionFraming`

**Decision**:

```ts
type ReadingMaterial = {
  title: string
  content: string       // 50-400 char description / excerpt
  url?: string          // optional external link
}

interface SectionFraming {
  // ... existing fields ...
  reading_material?: ReadingMaterial | null
}
```

Stored inside the existing `sections.framing` JSONB column — no schema migration.

**Rationale**: Optional and null-able (some sections won't have a recommendation). The shape mirrors the existing `opening_quote` `{ text, attribution }` pattern so authors only learn one mental model. JSONB tolerates the addition transparently.

**Alternatives considered**:
- **New `sections.reading_material_*` columns** — adds a migration for a field that may be null for most rows. Rejected.
- **First `info`-type exercise as a reading card** — conflates content (exercise) and framing (section-level). Rejected.
- **Repeat-string array** to allow multiple readings — YAGNI; one reading per section is what the workshop guide structures.

---

## R3 — Section locking computation

**Decision**: Locking is derived client-side from already-loaded `progress` rows.

```ts
const locked = (index: number, sections: Section[], progressMap: Map<string, Progress>) =>
  index > 0 && progressMap.get(sections[index - 1].id)?.section_completed_at == null
```

**Rationale**: `progress.section_completed_at` is the authoritative marker (set by the existing completion trigger). `useProgress` already fetches all rows in a single query. No new RPC, no new round-trip. Edge cases:

- No `progress` row for previous section (new participant) → previous `section_completed_at` is undefined → locked. Correct.
- Previous section in-progress (`section_completed_at = null`) → locked. Correct per spec ("100% completed").
- First section (index 0) → always unlocked.

**Alternatives considered**:
- **New `get_section_lock_status` RPC** — adds network latency for derivable data. Rejected.
- **Lock at `completed_exercises === total_exercises`** — equivalent in practice but bypasses the authoritative completion timestamp. Rejected because `section_completed_at` may pick up nuances (e.g., a section completed but later a new exercise added).

---

## R4 — WATUSI auto-count derivation

**Decision**: The ranking exercise for the six attitude types pulls the participant's prior checklist response (`attitude-types-checklist`) and counts items whose `id` starts with each WATUSI prefix (`w_`, `a_`, `t_`, `u_`, `s_`, `i_`). Counts are computed client-side via `useWatusiCounts(checklistResponse)`. The ranking is prefilled with `{order: ['attitude_w', 'attitude_a', ...]}` sorted by count descending, with ties broken by the canonical WATUSI order. The count badges below each ranked item are read-only display.

```ts
function deriveWatusiCounts(checked: string[]): Record<'w'|'a'|'t'|'u'|'s'|'i', number> {
  const counts = { w: 0, a: 0, t: 0, u: 0, s: 0, i: 0 }
  for (const id of checked) {
    const prefix = id.split('_')[0] as keyof typeof counts
    if (prefix in counts) counts[prefix] += 1
  }
  return counts
}
```

**Rationale**: The seed already uses the `{prefix}_{n}` ID convention (`w_1`, `a_11`, `t_19`, etc.). Reading the existing response is one Supabase query (`responses` table by `(participant_id, exercise_id)`), already in flight on the SectionPage load. The participant can still drag the prefilled order to break ties — the **saved** ranking is what the participant confirms, but counts are never editable.

**Re-derivation rule** (resolved from analysis A3): The prefilled order is computed *only* when no manual ranking response exists yet (`responses[ranking_exercise_id]` is null). Once the participant has saved a ranking — whether by manually dragging or by simply advancing the slide (which writes the prefilled order as their saved order) — subsequent checklist edits refresh the **count badges** but do NOT clobber the saved ranking. Implementation: the ranking renderer reads `responses[ranking_id]?.order` first; if set, it uses that as the displayed order. The `derives_from` computation is only consulted to seed an absent response and to refresh badges thereafter. This matches the user mental model "I made a choice → my choice persists, but the supporting numbers keep updating."

**Co-location on a single slide**: handled by FR-005's `slide_group` column. Both exercises share `slide_group = X`; the SectionPage renders all exercises in one group on a single slide.

**Alternatives considered**:
- **Server-side derivation via a new RPC** — adds latency and database surface for a pure-function computation. Rejected.
- **Storing derived counts in the ranking response** — duplicates state and risks drift between checklist edits and the rank. Rejected; recompute on render.
- **A new `ranked-from-checklist` exercise type** — over-specialised. Rejected; the existing `ranking` type plus a content-side `derives_from` reference (`{ source_exercise_slug: 'attitude-types-checklist', group_by: 'id_prefix' }`) is leaner.

---

## R5 — Values shopping spree: floating budget widget + gated proceed

**Decision**:
1. Mark a column as `col_types[i] = 'currency'` to make `TableExercise` aware that this column contributes to a running total.
2. Render a fixed-position `<ValueBudgetWidget budget={100000} spent={total} />` whenever the table has a currency column. Position: bottom-right on desktop, full-width sticky bottom on mobile.
3. Persist alongside rows: `response_json = { rows, total_spent }`. The total is recomputed on save (truthy source), so a stale total in the DB cannot corrupt UX.
4. The follow-on slide ("What Do I Value?") includes a `<ProceedGate />` that disables its primary action unless `total_spent === 100000`.

**Rationale**: Keeping the widget concern inside TableExercise via a `col_types` flag avoids adding a new exercise type. The gate logic on the next slide is a small standalone component reading the previous response.

**Alternatives considered**:
- **A new `currency-table` exercise type** — duplicates 95% of `TableExercise`. Rejected.
- **Compute total in the next slide on-the-fly** — also viable, but having `total_spent` cached in the response simplifies the "Proceed gate" check (no recomputation from the previous slide's rows). Both are kept: gate trusts response.total_spent for now; future-proof recompute available.

---

## R6 — Drag-and-drop ranking library

**Decision**: `@dnd-kit/core` (`v6.x`) + `@dnd-kit/sortable` (`v8.x`). Combined bundle ~8 KB gz.

**Rationale**:
- Maintained, React 18 strict-mode compatible, MIT-licensed.
- Built-in keyboard support (`KeyboardSensor`) — meets WCAG 2.1 AA (Up/Down to move focus, Space to grab/drop).
- Touch sensor included — Roles ranking works on tablets used in workshop rooms.
- API is small (`DndContext`, `SortableContext`, `useSortable`) and composes with existing list rendering — no full DOM control inversion.

Implementation note: `RankingExercise` accepts `content.interaction: 'drag' | 'buttons'`. Default `'buttons'` preserves existing behaviour for Attitudes (WATUSI), Values (ranked list), etc. Roles' two ranking exercises declare `interaction: 'drag'`.

**Alternatives considered**:
- **`react-beautiful-dnd`** — abandoned (last release Apr 2022), no strict-mode support, prop-drilled API. Rejected.
- **Native HTML5 DnD (`draggable` attribute)** — no touch, no keyboard, inconsistent across browsers. Rejected.
- **`@hello-pangea/dnd`** (rbnd fork) — actively maintained but ~22 KB gz. Rejected on bundle grounds.

---

## R7 — `structured-text` and `rating-picker` exercise types

**Decision**: Add two new values to the `exercises.type` check constraint: `'structured-text'` and `'rating-picker'`.

```sql
-- in migration 011 (or a separate small migration):
alter table public.exercises drop constraint if exists exercises_type_check;
alter table public.exercises add constraint exercises_type_check
  check (type in ('checkbox','text','table','ranking','info','structured-text','rating-picker'));
```

**Content / response shapes** (full detail in contracts/exercise-types.md):

```ts
// structured-text
type StructuredTextContent = {
  prompt: string
  questions: { id: string; label: string; placeholder?: string; min_length?: number }[]
}
type StructuredTextResponse = { answers: Record<string, string> }

// rating-picker
type RatingPickerContent = {
  prompt: string
  scale: { min: number; max: number; labels?: string[] }
  items: { id: string; label: string }[]
}
type RatingPickerResponse = { ratings: Record<string, number> }
```

**Legacy data handling**: Existing free-text responses for `past-experience-inventory`, `contract-with-myself`, `mission-statement` are preserved by writing them under `response_json._legacy: <original text>` during the seed migration. Frontend displays a small "*Previous answer preserved*" banner if `_legacy` is present, and asks the participant to fill the structured fields.

**Rationale**: Two new types are narrower and individually testable. The TypeScript-level discriminated union keeps each renderer simple.

**Alternatives considered**:
- **One generic `form` exercise type with a discriminated union of question types** — moves the union complexity into every renderer and into the seed. Rejected.
- **Migrate existing free-text answers automatically** by splitting on numbered headers — fragile; would silently corrupt freeform writing. Rejected.

---

## R8 — Bundle budget per workstream

| WS | Component additions | Estimated gz |
|----|---------------------|--------------|
| WS-1 | SlideNav, SectionIntroSlide, useSlideState, useSectionLock, CSS | ~2.5 KB |
| WS-2 | useWatusiCounts, count-badge CSS | ~0.6 KB |
| WS-3 | ValueBudgetWidget, useValuesTotal, CSS | ~1.4 KB |
| WS-4 | @dnd-kit/core + @dnd-kit/sortable + integration code | ~8.0 KB |
| WS-5 | StructuredTextExercise + CSS | ~1.0 KB |
| WS-6 | RatingPickerExercise + CSS | ~0.8 KB |
| WS-7 | (reuses WS-5/WS-6) | ~0.1 KB |
| WS-8 | TestimonialModal, TestimonialList, two pages, useTestimonials hook | ~2.5 KB |
| **Total** | | **~16.9 KB** |

**Verdict**: Slightly over the 15 KB target. Mitigation: lazy-load admin/facilitator TestimonialsPage (~−1 KB on the participant bundle), CSS deduplication across the three new components (~−0.5 KB). Final target: ≤ 15 KB gz on participant route; ≤ 16 KB on admin route. **Verified before merge** by `npm run build && du -sh dist/assets/*.js.gz`.

---

## R9 — Testimonials RLS strategy

**Decision**: Three RLS policies on `testimonials`:

```sql
-- self_select: participant can read their own testimonial
create policy testimonials_self_select on testimonials
  for select to authenticated
  using (participant_id = auth.uid());

-- self_insert/self_update: only users with role='participant' may author testimonials
-- (resolution of analysis A4 — facilitator-authored testimonials are out of scope).
create policy testimonials_self_insert on testimonials
  for insert to authenticated
  with check (
    participant_id = auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.role = 'participant')
  );

create policy testimonials_self_update on testimonials
  for update to authenticated
  using (
    participant_id = auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.role = 'participant')
  )
  with check (
    participant_id = auth.uid()
    and exists (select 1 from public.profiles p
                where p.id = auth.uid() and p.role = 'participant')
  );

-- facilitator_select: facilitator can read testimonials for their sessions
create policy testimonials_facilitator_select on testimonials
  for select to authenticated
  using (
    exists (select 1 from sessions s
            where s.id = testimonials.session_id
              and s.facilitator_id = auth.uid())
  );

-- admin_select: admin can read all
create policy testimonials_admin_select on testimonials
  for select to authenticated
  using (
    exists (select 1 from profiles p
            where p.id = auth.uid() and p.role = 'admin')
  );
```

**No delete policy** is created → no role can delete a testimonial via the data API. (Admins can DELETE only with the service-role key, e.g. for moderation incidents.)

**Rationale**: Mirrors the iteration 1+2 RLS patterns used for `responses` and `progress` — keeps lint-clean (RLS enabled, every operation explicitly policied or denied).

**Alternatives considered**:
- **Allow facilitators to update/delete** — exceeds spec scope and risks accidental data loss. Rejected.
- **Public read (anyone) for marketing** — out of scope (spec, "Out of scope").

---

## R10 — Multi-question text completion semantics

**Decision**: A `structured-text` exercise is **complete** (`responses.is_complete = true`) iff every question with `min_length ≥ 1` has an answer of at least that length. Empty `min_length` defaults to `1`. The completion check is performed:

1. Client-side, before flipping the right-arrow gate.
2. Inside `useExerciseSave` when computing the `is_complete` flag for persistence.

The DB does **not** enforce per-sub-answer completion (the JSON shape is opaque to Postgres), so partial autosaves write `is_complete = false` but preserve whatever the user has typed.

**Rationale**: This mirrors the existing `TextExercise`'s `min_length`/`max_length` semantics, scaled to N sub-questions. Keeping enforcement client-side avoids JSONB-level CHECK constraints that would be hard to evolve.

---

## R11 — Course-completion screen and testimonial CTA placement

**Decision**: A new `/course/complete` route renders `CourseClosing.tsx` when every section's `progress.section_completed_at` is non-null. The page shows: an overall completion summary, attribution lines, and a primary **Leave a testimonial** button that opens `TestimonialModal`. The right-arrow on the closing slide of the final section (`goal-setting`) navigates here.

**Rationale**: Keeps the testimonial CTA at the natural emotional peak (course-completion) without polluting the per-section closing slide.

**Alternatives considered**:
- **Modal triggered from My Course header when 100% done** — easier to miss; less ceremony. Rejected.
- **Testimonial as the final exercise** — conflates user-generated content with workbook content; complicates `responses` shape. Rejected.

---

## R12 — Resume position with slide-group awareness

**Decision**: When restoring `currentSlide` from `progress.last_exercise_id`, the SectionPage resolves the exercise's `slide_group` and sets `currentSlide` to that group's index (not the exercise's individual index). If `last_exercise_id` is unset, start at `-1` (intro slide).

**Rationale**: Slide-group co-location (e.g., WATUSI checklist + ranking on one slide) means an exercise index is not the same as a slide index. The resolver function (`slideIndexForExercise`) sits in `lib/exerciseCompletion.ts`.

---

## R13 — Realtime considerations

**Decision**: Testimonials do **not** subscribe to realtime updates in this iteration. The Admin and Facilitator dashboards fetch on page load + a manual "Refresh" button. Adding realtime would mean another channel + RLS-filter; defer.

Existing `useRealtimeSession` (for session participant progress) is untouched.

**Rationale**: Testimonials are low-velocity (one per participant per course). Polling/refresh is sufficient.
