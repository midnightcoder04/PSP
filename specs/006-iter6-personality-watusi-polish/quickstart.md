# Quickstart — Iter6 Manual Verification

Walk-through to verify each user story end-to-end against the locally-running app.

## Prereqs

- Migration 016 applied to local Supabase: `supabase db reset` or `psql -f db/migrations/016_personality_deep_dive.sql`.
- Dev server running: `pnpm dev` (port 5173).
- A test participant logged in (`/login` → magic link or test credentials per `001-psp-course-platform/plan.md`).

## §1 — US2 + US1: WATUSI sorted listing (P1)

1. Navigate to `/course/attitudes`.
2. Click **Begin** on the section intro.
3. On the "Identifying Your Attitudes" slide:
   - Tick `w_1`, `w_2`, `w_3`, `w_4`, `w_5` (5 W's).
   - Tick `a_10`, `a_11`, `a_12` (3 A's).
   - Tick `i_43` (1 I).
   - **Verify**: the new tally chip strip shows `W 5 · A 3 · T 0 · U 0 · S 0 · I 1` and updates synchronously.
4. Click **Next**.
5. On the "Six Attitude Types — WATUSI" slide:
   - **Verify**: rows render in order **W (5), A (3), I (1), T (0), U (0), S (0)**.
   - **Verify**: no drag handles, no up/down buttons, no `#` rank column.
   - **Verify**: the count chip on each row sits on the right end of the row, inline.
   - **Verify**: at viewport 375×667, scroll to bottom — the sticky Next button is fully visible and clickable; no chip floats over it.
6. Click **Next** again.
   - **Verify**: the slide-gate advances without a manual interaction (auto-complete-on-mount). Lands on "Attitude Power Points — Reflection".

## §2 — US4: Power-Points reflection prompt formatting (P3)

1. From §1 step 6, you should be on the Power-Points Reflection slide.
2. **Verify**: the six numbered Attitude Power Points appear as a vertical `<ol>` — each item on its own line:
   1. An attitude is a way of valuing life…
   2. Most of a person's choices throughout life…
   3. Attitudes determine our purpose…
   4. Attitudes are relatively constant…
   5. Behaviour (D.I.S.C.) is the methodology…
   6. Attitudes tend to interact with one another.
3. **Verify**: the trailing question ("How do your top two attitude types interact?…") renders as a `<p>` block below the list.

## §3 — US3: Personality matched-style deep-dive (P2)

### Path A — Extrovert + Task-oriented → HIGH D

1. Navigate to `/course/personality`.
2. Click **Begin**.
3. Read the DISC introduction. Click **Next**.
4. **Slide 2** (Quiz):
   - Q1: tick "Predominantly extroverted".
   - Q2: tick "Task-oriented".
5. Click **Next**.
6. **Slide 3** (Core style result): **Verify** the message reads "Your core style is HIGH D."
7. Click **Next**, **Next**, **Next** through the four profile read-throughs (D, I, S, C).
8. **Slide 7** (Characteristics): **Verify** only HIGH-D content is shown:
   - "If you are HIGH D, you are..." followed by bullets: Able to make decisions quickly, Willing to state unpopular opinions, Risk taking.
   - **Verify**: no HIGH-I/S/C content in the DOM (inspect via dev tools).
9. **Slide 8** (Ideal Environment): **Verify** HIGH-D content only.
10. **Slide 9** (Characteristics Checklist): **Verify** the 17 HIGH-D traits are listed. Tick 4-5 of them. **Verify** save indicator appears. Click **Next** — slide advances even with no ticks (optional input). Click **Previous** → return → ticks persist.
11. **Slide 10** (Comfort Zones): **Verify** the four D-cross-pair notes are shown.
12. Click **Next** → section-closing slide → next section. **Verify**: NO "My Core Style" text exercise appears.

### Path B — Introvert + People-oriented → HIGH S

Re-run with quiz answers `Introvert` + `People-oriented`. Verify slides 7–10 show ONLY HIGH-S content.

### Path C — Quiz not answered

1. Open an incognito session, log in as a new participant.
2. Navigate directly to `/course/personality` and advance past the read-throughs WITHOUT answering the quiz (this should not be reachable via Next gating; force-navigate via URL or by clearing the quiz response in dev tools).
3. **Verify** each of the four new deep-dive slides shows the fallback message: "Answer the two questions on slide 2 to see your matched style's content here."

## §4 — Regression checks

- **WATUSI count badge field-name fix (iter5 carryover)**: re-run §1 step 3 — the per-group tally must populate immediately as you tick (no stale zero counts).
- **Slide-state reset on section change (iter5)**: from `/course/personality` (mid-section), click "Roles & Their Demands" in the sidebar → must land on the section intro, not at slide N.
- **Sidebar collapse (iter5)**: click the chevron toggle — sidebar collapses to icon-only with smooth transition; refresh page — collapsed state persists via localStorage.
- **Existing 234 Vitest tests**: `pnpm vitest run` → all GREEN.

## §5 — Migration verification

```bash
# Idempotency check (run migration twice)
psql -f db/migrations/016_personality_deep_dive.sql
psql -f db/migrations/016_personality_deep_dive.sql

# Invariant assertions
psql -f db/tests/016_deep_dive_exercises_invariants.sql
psql -f db/tests/016_idempotency.sql
```

All assertions GREEN.

## §6 — Lighthouse

```bash
pnpm dlx lighthouse http://localhost:5173/course/personality \
  --only-categories=performance \
  --form-factor=mobile \
  --throttling-method=devtools
```

TTI ≤ 3 500 ms; LCP ≤ 2 500 ms.
