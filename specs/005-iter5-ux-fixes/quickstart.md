# Quickstart — Iteration 5 UX Fixes

Dev setup is identical to Iter 4. See `specs/001-psp-course-platform/plan.md §Quickstart` for the canonical onboarding flow. This document adds:

1. How to apply migration 015 locally.
2. Per-user-story manual verification recipes.

---

## 0. Dev setup recap (1 minute)

```bash
# from repo root
npm install                # only if node_modules drifted
npm run dev                # starts Vite at http://localhost:5173
supabase start              # local DB (only if you're testing migration 015)
```

If `supabase start` complains about ports, run `supabase stop` then re-start. Auth uses the local supabase project; credentials seeded by Iter 1's `001_*.sql`.

---

## 1. Apply migration 015 locally

```bash
# 1. Regenerate seed JSON (Personality section only — but the script does the full file)
npm run seed:regenerate      # if a script exists; otherwise hand-edit db/seeds/course-content.json

# 2. Validate the seed against the per-question contract
npm run seed:validate

# 3. Apply the migration
supabase db reset            # if you want a clean slate
# OR
psql "$SUPABASE_DB_URL" -f db/migrations/015_personality_quiz.sql

# 4. Sanity-check the row count
psql "$SUPABASE_DB_URL" -c "
  SELECT slug, order_index, slide_group
  FROM exercises e
  JOIN sections s ON s.id = e.section_id
  WHERE s.slug='personality'
  ORDER BY order_index;
"
# expected: 9 rows in the order listed in contracts/personality-exercises.md
```

---

## 2. Manual verification recipes

### US1 — Sidebar collapse (SC-1)

1. Visit any course page at viewport ≥ 1024 px.
2. Locate the collapse toggle at the top-right of the sidebar (chevron icon).
3. Click it. **Expected**: sidebar shrinks to ~56 px width over ~200 ms. Nav icons remain visible. Main content's left margin shrinks in lockstep. No visible layout jump.
4. Hover any nav icon. **Expected**: route still navigates correctly on click; screen reader announces the destination via the `NavLink`'s `aria-label`.
5. Reload the page. **Expected**: sidebar starts collapsed (state restored from `localStorage`).
6. Click toggle again. **Expected**: expands smoothly. Reload again. **Expected**: starts expanded.
7. Resize viewport to 600 px (mobile). **Expected**: sidebar hidden (existing mobile behaviour); toggle button hidden too. Resize back to 1024 px+. **Expected**: sidebar reappears in whatever state it was in before mobile.
8. Open DevTools → Performance, record a 5-second window, toggle once. **Expected**: animation duration < 250 ms; no layout thrash beyond the single width transition.
9. `prefers-reduced-motion: reduce` → toggle. **Expected**: instant state change, no transition.

### US2 — Slide spacing (SC-2)

1. Visit `/course/attitude`. Advance past the intro slide to "What Is an Attitude?" (a single-exercise info slide).
2. Open DevTools → Elements. Inspect the `.slideTrack` container.
3. **Expected**: its height equals the active `.slide`'s height (active slide rendered statically; inactive slides are `position: absolute; visibility: hidden;` AND `height: 0` — or removed from layout in some other way).
4. Measure the vertical gap from the bottom of the last exercise card to the top of the SlideNav. **Expected**: ≤ 48 px (`var(--space-6)`).
5. Advance to the WATUSI slide (slide_group 2, taller because it stacks `identifying-attitudes` + `attitude-types-watusi`). **Expected**: page expands cleanly; no jump beyond the actual height delta.
6. Advance backwards. **Expected**: page contracts; SlideNav follows up the page.

### US3 — Slide state resets across sections (SC-3, BLOCKING)

1. Visit `/course/personality`. Walk through every slide (intro → DISC intro info → quiz → result → 4 profiles → people-reading → closing).
2. At the closing slide, click "Continue to next section →".
3. **Expected**: URL becomes `/course/attitude`. The visible slide is the **intro slide** (opening quote + "Why this matters" + "Begin →" button at the bottom). The Next button reads **"Begin →"**.
4. Click "Begin →". **Expected**: advances to slide 0 ("What Is an Attitude?" info exercise). Next button reads **"Next →"**.
5. Use the browser back button. **Expected**: returns to the intro slide of Attitudes (not back to Personality).
6. Refresh the page on `/course/attitude` while at slide 0. **Expected**: page reloads at slide 0 (resume via progress).
7. Repeat for Attitudes → Values, Values → Roles, etc. All hand-offs land at intro (or progress-resume position).
8. Regression check: open `/course/personality` directly in a new tab. **Expected**: intro slide shows; "Begin →" label visible.

### US4 — WATUSI count freshness (SC-4, BLOCKING)

**Validation procedure** (from `research.md §R2`):

1. Apply only the US3 fix locally (skip US4 patches).
2. Walk Personality → Attitudes. Land at Attitudes intro. Begin → reach slide 2 (the slide with `identifying-attitudes` + `attitude-types-watusi`).
3. Tick `w_1` ("I like solving problems."). **Expected (hypothesis A)**: the WATUSI badge next to "W — The Theoretical Attitude" reads `1` immediately.
4. Untick. **Expected**: badge reads `0` or hides (see R5).
5. Tick three W-items, two A-items. **Expected**: badge shows 3 on W, 2 on A; ranking re-orders accordingly.
6. **If hypothesis A holds** (badges update within one frame): no further US4 patch needed. SC-4 satisfied.
7. **If hypothesis A fails** (badges stay stale): apply FR-032 workaround per `research.md §R2`. Re-run steps 3–5.

Independent UI tick test: drag any ranking row. **Expected**: order updates. Next button enables.

### US5 — Personality two-question quiz + read-throughs (SC-5)

1. Open `/course/personality`. Walk through the slides.
2. Slide 1 — DISC intro (info). Next reads "Next →". Click.
3. Slide 2 — two-question quiz. **Expected**: two prompts visible:
   - "Are you predominantly EXTROVERTED or INTROVERTED?" (radio-like, single-select)
   - "Are you predominantly PEOPLE-ORIENTED or TASK-ORIENTED?" (radio-like, single-select)
4. Pick "Extroverted" + "Task-oriented". Verify Next button enables.
5. Slide 3 — result card. **Expected**: prose shows "Your Core Style is D — Dominance." (Or the equivalent based on the answers.)
6. Slides 4–5 — four info read-throughs (HIGH D, HIGH I, HIGH S, HIGH C). **Expected**: each shows strengths / ideal environment / characteristics / comfort zone as prose paragraphs. **No checkboxes**.
7. Slide 6 — People Reading reflection (`my-core-style`, `type='text'`, single textarea — unchanged from current seed).
8. Closing slide — "Continue to next section →".
9. Go back to slide 2. Change the answer to Introverted + People-oriented. Slide 3 result updates to "Your Core Style is S — Steadiness."
10. Verify the four removed exercises do NOT appear anywhere: `disc-core-style-{d,i,s,c}` and `identifying-personal-style` slugs are gone.

### US6 — "What is …" single-column layout (SC-6)

1. Visit `/course/attitude` → slide 1 ("What Is an Attitude?" info).
2. Open DevTools → Computed styles for the `.text` container.
3. **Expected**: `column-count: 1` (or `auto` resolved to single column). `grid-template-columns` (if any ancestor sets it) does not split the prose into > 1 column.
4. Resize viewport to 320 px, 768 px, 1024 px, 1440 px. **Expected**: numbered list items always render one-per-row at every width.
5. Repeat for other "What is …" info slides (Values, Roles, etc.).

---

## 3. Test commands

```bash
# Unit + component tests
npm test -- src/hooks/useSlideState.test.ts
npm test -- src/hooks/useSidebarCollapse.test.ts
npm test -- src/components/layout/Sidebar.test.tsx
npm test -- src/components/exercise/RankingExercise.test.tsx
npm test -- src/lib/coreStyle.test.ts
npm test -- src/pages/course/SectionPage.test.tsx

# SQL test suite (Iter 3 convention)
psql "$SUPABASE_DB_URL" -f db/tests/015_personality_exercises_invariants.sql
psql "$SUPABASE_DB_URL" -f db/tests/015_idempotency.sql

# Seed validator
npm run seed:validate
```

All must pass before merging.

---

## 4. Performance spot-check (SC-PERF-1 through SC-PERF-4)

- **SC-PERF-1** (sidebar transition): DevTools Performance → record toggle → expect single layout pass under 200 ms.
- **SC-PERF-2** (WATUSI count update): DevTools Performance → record one checkbox tick → expect badge re-render within one frame (~16 ms).
- **SC-PERF-3** (slide-state reset on section change): record Personality closing → "Continue to next section" → expect Attitudes intro slide active within one paint after data load (no flash of slide 0 or closing slide before settling).
- **SC-PERF-4** (bundle delta): `npm run build` before + after; compare `dist/` total `.js` size (gzipped via e.g. `gzip -9k`). Expect ≤ 1.5 KB delta.

---

## 5. Rollback

If anything regresses post-merge:

- **CSS-only changes (US1, US2, US6)**: revert the affected `*.module.css` files in a single commit.
- **`useSlideState` change (US3)**: revert `src/hooks/useSlideState.ts` and `src/pages/course/SectionPage.tsx`; the WATUSI symptom (US4) will resurface but participants can still complete the course by manually reloading each section.
- **Migration 015**: prepare `016_revert_personality_quiz.sql` that re-inserts the legacy 6 Personality rows from `004-content-restructure` seed. Apply against staging first.
