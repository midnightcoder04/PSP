# Quickstart — Iteration 4 (003-slide-nav-ux-rework)

Hands-on guide for implementing and verifying each workstream.

---

## 0. Prerequisites

```bash
# at repo root
npm ci
# Iteration 1 local supabase dev workflow is assumed; if not yet set up:
# (see specs/001-psp-course-platform/quickstart.md, sections "Local Supabase" and "Seed data")
```

Branch:

```bash
git switch -c 003-slide-nav-ux-rework        # if not already
```

Install the one new dependency:

```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

Verify bundle baseline (before any changes) so you can measure the delta later:

```bash
npm run build && du -sh dist/assets/*.js.gz | sort -h | tee /tmp/bundle-before.txt
```

---

## 1. Migrations

Author the two new SQL migrations (mirror each in both `db/migrations/` and `supabase/migrations/`):

- `011_exercise_slide_group.sql` — adds `exercises.slide_group int` column, extends the `type` CHECK constraint to allow `'structured-text'` and `'rating-picker'`.
- `012_testimonials.sql` — creates the table, RLS policies, indexes, trigger.

Apply locally:

```bash
supabase migration up   # or: psql $LOCAL_DB_URL -f db/migrations/011_*.sql -f db/migrations/012_*.sql
```

Apply to hosted (only after review):

```bash
npm run db:apply         # or: supabase db push
```

Re-seed (this picks up the new `slide_group`, the rewritten exercises, and the `reading_material` per section):

```bash
npm run seed
```

---

## 2. WS-1 — Slide navigation + section locking

**Files**: `src/pages/course/SectionPage.tsx`, `src/pages/course/CourseHome.tsx`, `src/components/section/SectionIntroSlide.tsx`, `src/components/section/SectionClosingSlide.tsx`, `src/components/section/SlideNav.tsx`, `src/hooks/useSlideState.ts`, `src/hooks/useSectionLock.ts`, `src/components/ui/LockIcon.tsx`.

**Tests first** (vitest):

- `SlideNav.test.tsx` — renders prev/next buttons, disables next when `canGoNext=false`, hint is announced via `aria-live`.
- `useSlideState.test.ts` — initial slide for `resumeExerciseId` (intro, mid-section, fully complete → closing); next/prev clamping; gate behaviour.
- `useSectionLock.test.ts` — section 0 unlocked; subsequent locked until prior `section_completed_at`.
- `CourseHome.test.tsx` — locked card renders LockIcon and is non-button; hover hint string.
- `SectionPage.test.tsx` — only one slide visible at a time; right-arrow gating; final slide → next-section navigate.

**Manual verification**:

```text
1. Log in as a brand-new participant.
2. Visit /course. Confirm only "Personality" is interactive; all others show a lock + hint.
3. Open Personality. Confirm the intro slide renders quote + opening Q + why + (optional) reading.
4. Click "Begin →". Confirm only exercise 1 is visible.
5. Try clicking →. It should be disabled (with a hint).
6. Complete the first exercise. → becomes enabled.
7. Click →. Exercise 2 appears.
8. Click ←. Exercise 1 reappears.
9. Complete all exercises. Closing slide appears with "Continue to next section".
10. Return to /course. "Attitudes" is now unlocked.
```

---

## 3. WS-2 — WATUSI auto-count + linked slide-group

**Files**: `src/hooks/useWatusiCounts.ts`, `src/components/exercise/RankingExercise.tsx` (extend), `db/seeds/course-content.json` (set `slide_group` to a shared value for the checklist + ranking; set `derives_from` on the ranking).

**Tests first**:

- `useWatusiCounts.test.ts` — counts items by id prefix; tie-breaking by canonical WATUSI order.
- `RankingExercise.test.tsx` — when `show_counts: true` and `derives_from` set, count badges render and are not editable; checking a checklist item upstream updates counts here (integration test via a wrapping component that supplies both responses).

**Manual verification**:

```text
1. Log in as a participant. Navigate to Attitudes.
2. Reach the WATUSI checklist slide. Confirm checklist + ranking render on ONE slide.
3. Tick 7 W-items and 3 S-items. Confirm the ranking below reorders so W is first (count badge "7") and S is second (count badge "3").
4. Confirm clicking on a count badge does NOTHING (it's read-only).
5. Drag the W and A items to swap them. The saved order should reflect your manual choice, but the count badges follow their items.
```

---

## 4. WS-3 — Values shopping spree budget widget + gated proceed

**Files**: `src/components/exercise/TableExercise.tsx` (extend with `col_types: 'currency'` awareness), `src/components/exercise/ValueBudgetWidget.tsx`, `src/hooks/useValuesTotal.ts`, `db/seeds/course-content.json` (set `col_types: ['currency','text']`, `total_target: 100000`).

**Tests first**:

- `useValuesTotal.test.ts` — sums numeric values, ignores non-numeric, handles empty.
- `ValueBudgetWidget.test.tsx` — renders Spent/Remaining; recolours at exactly 100k and over.
- `TableExercise.test.tsx` — when `col_types` includes `'currency'`, widget renders and `response.total_spent` is computed on save.

**Manual verification**:

```text
1. Log in. Navigate to Values → Values Shopping Spree slide.
2. Confirm the floating widget appears at bottom-right (mobile: full-width sticky).
3. Type 5000 in row 1. Widget shows "Spent: $5,000 / Remaining: $95,000".
4. Type 95000 in row 2. Widget recolours to "Perfect" state.
5. Type 1 more in row 3. Widget recolours to "Over budget".
6. Adjust to exactly 100,000 total. Click → to proceed.
7. On the "What Do I Value?" slide, the Proceed button is enabled.
8. Re-edit row 1 to a smaller value. The Proceed button on the previous slide should now be disabled (back-navigate to confirm).
```

---

## 5. WS-4 — Drag-and-drop ranking (Roles)

**Files**: `src/components/exercise/RankingExercise.tsx` (add `interaction: 'drag'` branch using `@dnd-kit/sortable`), `db/seeds/course-content.json` (Roles ranking exercises declare `interaction: 'drag'`).

**Tests first**:

- `RankingExercise.test.tsx` — when `interaction === 'drag'`, the up/down buttons are NOT rendered; dnd-kit `SortableContext` is rendered; keyboard reordering (Up/Down + Space) works.

**Manual verification**:

```text
1. Log in. Navigate to Roles & Their Demands → first ranking exercise.
2. Mouse: grab any item, drag it. Confirm smooth reorder + drop.
3. Touch (on tablet/mobile emulator): same.
4. Keyboard: Tab to an item. Press Space — it announces "Grabbed". Up/Down to move. Space again to drop. Esc cancels.
5. Saved order persists across reload.
```

---

## 6. WS-5 — Structured multi-question text exercises

**Files**: `src/components/exercise/StructuredTextExercise.tsx`, `src/lib/exerciseCompletion.ts` (new `isStructuredTextComplete`), `db/seeds/course-content.json` (rewrite `past-experience-inventory`, `contract-with-myself`, `mission-statement` to type `'structured-text'`).

**Tests first**:

- `StructuredTextExercise.test.tsx` — renders N labelled textareas; min-length gating; legacy banner when `_legacy` is present.
- `exerciseCompletion.test.ts` — `isStructuredTextComplete` returns true only when all min-lengths met.

**Manual verification**:

```text
1. Visit Roles → Past Experience Inventory. Confirm 14 labelled textareas (not one big field).
2. Fill 13 of 14. Right-arrow remains disabled.
3. Fill the 14th. Right-arrow enables.
4. (Legacy participant) On a profile that had an old free-text answer, confirm a "Previous answer preserved" banner appears with the original text quoted.
```

---

## 7. WS-6 — Rating picker (Transferable Skills)

**Files**: `src/components/exercise/RatingPickerExercise.tsx`, `db/seeds/course-content.json` (rewrite `determining-transferable-skills` to type `'rating-picker'` with 1–5 scale).

**Tests first**:

- `RatingPickerExercise.test.tsx` — renders N radio groups; only one selection per item; completion only when every item rated.

**Manual verification**:

```text
1. Visit Transferable Skills → Determining My Transferable Skills.
2. Each skill row shows 5 radio buttons (1=Strongly Disagree…5=Strongly Agree).
3. Click 1–5 on each. The exercise completes when every skill has a rating.
4. Click → to advance to My Favorite Skills.
```

---

## 8. WS-7 — Goal Setting pattern application

**Files**: `db/seeds/course-content.json` (rewrite any Goal Setting exercises that fit the new patterns — typically the Life Goal Inventory and Goal Achievement Plan).

This WS is largely **seed authoring**, not new code. No new components. Verify only that:

- Multi-question exercises use `structured-text`.
- Any rating-style exercises use `rating-picker`.
- Any ranking uses `ranking` with the appropriate `interaction`.
- Cross-Impact Matrix remains `table` (no change needed).

**Manual verification**: Walk through the full Setting Goals section and confirm each exercise renders with the chosen new component shape.

---

## 9. WS-8 — Testimonials

**Files**: `src/pages/course/CourseClosing.tsx`, `src/components/testimonials/TestimonialModal.tsx`, `src/components/testimonials/TestimonialList.tsx`, `src/pages/admin/TestimonialsPage.tsx`, `src/pages/facilitator/TestimonialsPage.tsx`, routing updates in `App.tsx` and `lib/constants.ts`.

**Tests first**:

- `TestimonialModal.test.tsx` — 50/1500 char enforcement; rating optional; submit calls upsert.
- `TestimonialList.test.tsx` — renders rows; row click expands content; empty state.
- `scripts/testimonials.test.ts` — RLS matrix per the table in `contracts/testimonials-api.md`.

**Manual verification**:

```text
1. Complete every section as a participant. Reach /course/complete.
2. Click "Leave a testimonial". Modal opens.
3. Try submitting with 10 chars — blocked at 50-char minimum.
4. Type 100+ chars, choose rating=5, submit. Confirm success toast.
5. Log in as the facilitator of that session. Navigate to /facilitator/testimonials. Confirm the testimonial appears.
6. Log in as another facilitator. Confirm the testimonial does NOT appear.
7. Log in as admin. Navigate to /admin/testimonials. Confirm the testimonial appears with facilitator name shown.
8. As the original participant, re-open the modal. Confirm the form is prefilled with the existing testimonial. Edit content, submit. Confirm the row in the admin view updates (not duplicates).
```

---

## 10. Bundle delta verification (gate before PR)

```bash
npm run build
du -sh dist/assets/*.js.gz | sort -h | tee /tmp/bundle-after.txt
diff /tmp/bundle-before.txt /tmp/bundle-after.txt
```

Confirm total delta on participant route ≤ 15 KB gz. Admin-only chunks (TestimonialsPage) should be lazy-loaded so they do not inflate the participant bundle.

---

## 11. CI / final gates

```bash
npm test -- --run                    # all 102+ existing tests still green + new ones
npm run lint                         # no new warnings
npm run check:no-bypass              # no dev sentinels in dist
npm run build                        # production bundle succeeds
# Optional but recommended:
npm run audit:security               # check advisor reports include no new findings
```

---

## 12. Notes on legacy data

Free-text responses for `past-experience-inventory`, `contract-with-myself`, `mission-statement` from iterations 1–2 are **not auto-migrated** into structured fields. The frontend displays them under a "Previous answer preserved" banner so the participant can copy-paste into the new fields. This decision is documented in research.md R7.
