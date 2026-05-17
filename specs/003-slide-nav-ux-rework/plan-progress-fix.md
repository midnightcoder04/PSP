# Bug-Fix Plan: Section-Lock False Positive (Progress NULL-Unique Bug)

**Branch**: `003-slide-nav-ux-rework` | **Date**: 2026-05-15 | **Parent plan**: [plan.md](plan.md)
**Bug class**: Data integrity (DB constraint) + completion-semantics mismatch
**Severity**: HIGH — corrupts the participant's section-lock state; participants reach later sections without legitimately completing prior ones (and conversely some sections can never auto-complete).

> Sub-plan scope: This is **not** a new iteration. It is a follow-up fix tracked inside Iteration 4 because the symptom (Roles unlocking before Values is complete) was discovered while testing the slide-nav rework. The migration adds the corrective work that the trigger from 004_responses_progress.sql should have done from the start.

---

## 1. Summary

`progress.section_completed_at` is being set incorrectly, causing `useSectionLock` to unlock sections whose prereqs are not actually complete. Two compounding root causes:

| # | Cause | Where |
|---|-------|-------|
| RC-1 | The `UNIQUE (participant_id, exercise_id, session_id)` constraint on `responses` and `UNIQUE (participant_id, section_id, session_id)` on `progress` are **not enforced when `session_id IS NULL`** because Postgres treats `NULL` as distinct by default. Every "solo course" upsert therefore inserts a new row instead of updating — accumulating duplicates. | `db/migrations/004_responses_progress.sql:12, 29` |
| RC-2 | `update_progress_on_response` computes `v_total = COUNT(*) FROM exercises WHERE section_id = …` without filtering out `type = 'info'`, but info exercises never persist responses. So sections that contain an info exercise can never legitimately auto-complete; conversely, duplicate completes (RC-1) can inflate `v_completed` past `v_total` even with an info row counted. | `db/migrations/004_responses_progress.sql:50-65` |

**Observed in live DB (project `okedskadkspeiyxjslqc`, participant `706a8245-…`):**
- `responses` table: **72 rows / 13 distinct keys** under `session_id IS NULL`.
- `progress` table: **72 rows / 5 distinct keys** under `session_id IS NULL`.
- Personality `disc-core-style-d` checkbox has **9 duplicate `is_complete=true` rows**.
- Values `what-do-i-value` ranking has 6 complete rows → trigger sees `v_completed=6 ≥ v_total=3` → Values marked complete → Roles unlocks.

The client (`src/pages/course/SectionPage.tsx:148`) already filters out info exercises for its progress display — so the trigger and client are out of sync. This sub-plan re-aligns them.

---

## 2. Goals & Non-Goals

**Goals**
- G-1: `responses` and `progress` enforce true row-uniqueness regardless of whether `session_id` is `NULL`.
- G-2: The progress trigger's `v_total` matches the client's completion semantics (info exercises excluded).
- G-3: Existing corrupted state is repaired: duplicate rows deleted, `section_completed_at` recomputed against current responses, no participant is "stuck" or "skipped" by the migration.
- G-4: Section-lock derivation continues to work from already-loaded `progress` rows — no new round-trips.

**Non-Goals**
- Changing the lock model itself (still keyed on `section_completed_at`).
- Touching the live `sessions`-flow data path — only `session_id IS NULL` rows are demonstrably affected, but the constraint fix benefits both.
- Re-deriving completion from a different field set (e.g. moving lock state to a computed view) — out of scope for a hot-fix; can be considered in Iteration 5.

---

## 3. Technical Context

- **Postgres version**: 17.6 (Supabase project `okedskadkspeiyxjslqc`). `NULLS NOT DISTINCT` is available from PG 15 — supported.
- **Affected tables**: `public.responses`, `public.progress`.
- **Affected function**: `public.update_progress_on_response()` (SECURITY DEFINER).
- **Affected RLS surface**: None — neither the policies nor the column shape change; only the unique-index definition and the trigger body.
- **Client surface**: `useExerciseSave` already passes `onConflict: 'participant_id,exercise_id,session_id'` — once the underlying constraint uses `NULLS NOT DISTINCT`, the existing upsert will start behaving correctly with no client change.
- **No bundle delta** (DB-only fix).
- **Existing automated test for the trigger**: `db/tests/004_progress_trigger.sql` — must be re-run and extended.

---

## 4. Constitution Check

| Principle | Verdict | Notes |
|-----------|---------|-------|
| I. Code Quality | ✅ | Migration is small, linear, idempotent (`IF NOT EXISTS`/`DROP IF EXISTS`). Trigger body change is two new `WHERE … AND e.type <> 'info'` clauses. |
| II. Test-First | ✅ | Add two failing tests before applying the trigger fix: (a) info-exclusion test in `db/tests/`, (b) NULL-session-uniqueness test asserting `upsert` updates rather than inserts. Existing `004_progress_trigger.sql` extends with both cases. Client-side: extend `useSectionLock.test.ts` only if the API surface changes (it does not — skip). |
| III. UX Consistency | ✅ | No UI change. Sections that were incorrectly unlocked will re-lock for the affected participant after recompute; this is the correct UX. |
| IV. Performance | ✅ | One-time backfill is `O(rows)` over ~70 rows. Trigger remains `O(1)` per response insert. No new round-trips. No bundle delta. |
| Content & IP | ✅ | No content surfaces touched. |

No new violations. Complexity Tracking unchanged from parent plan.

---

## 5. Phase 0 — Research / Decisions

### R-1 — Constraint repair strategy: `NULLS NOT DISTINCT` vs. partial indexes vs. sentinel UUID

**Decision**: Use `CREATE UNIQUE INDEX … (cols) NULLS NOT DISTINCT` and reference it from `ON CONFLICT (cols)`.

**Rationale**: PG 15+ idiom, explicit, no app-layer changes, no sentinel values bleeding into the data. `ON CONFLICT (cols)` matches a unique index whether `NULLS NOT DISTINCT` is set or not — so the existing client upsert keeps working.

**Alternatives rejected**:
- *Partial unique index pair* (one for `session_id IS NOT NULL`, one for `session_id IS NULL`): two indexes to maintain, and `ON CONFLICT (cols)` cannot target two distinct indexes.
- *Sentinel UUID for "no session"*: pollutes the data model; would require coalescing in every read.
- *Application-side dedup*: doesn't repair already-corrupt rows and leaves the race-window open.

### R-2 — Dedup row-selection rule

**Decision**: For both tables, keep the most-recent row per key (`updated_at DESC` for `responses`; `last_activity_at DESC` for `progress`). Tie-break on `id` to be deterministic.

**Rationale**: The most-recent row reflects the participant's latest intent. For `progress` specifically, the most-recent row may still hold a wrong `section_completed_at` (the trigger set it during the duplicate-row phase). The Phase 1 backfill (R-3) corrects that.

### R-3 — Backfill recompute

**Decision**: After dedup + constraint swap, run a single `UPDATE progress SET … FROM (SELECT … FROM responses GROUP BY participant_id, section_id, session_id) …` that recomputes `completed_exercises`, `total_exercises` (info-excluded), and `section_completed_at` for every surviving row. If a row has no matching responses at all, leave `section_completed_at = NULL`.

**Rationale**: Aligns post-migration state with the new trigger's semantics. Without this, stale `section_completed_at` values from the corrupt-row era persist on the surviving row.

### R-4 — Trigger info-exclusion

**Decision**: Both `v_total` and `v_completed` filter `e.type <> 'info'`. Match `src/pages/course/SectionPage.tsx:148` exactly.

**Rationale**: The client already treats info as auto-complete for navigation (`useSlideState.groupComplete`). The trigger must agree or the client/DB disagree on whether a section is complete.

### R-5 — Idempotence & rollback

**Decision**: Wrap the migration in a `BEGIN … COMMIT` block and make each step idempotent (`DROP … IF EXISTS`, `CREATE … IF NOT EXISTS`). Provide a sibling `013_fix_progress_nulls_down.sql` rollback that restores the pre-migration trigger body and the old constraints (but does NOT re-introduce duplicate rows — the dedup is permanent).

**Rationale**: Iteration 4 is already on a feature branch; if anything goes wrong after the migration ships to Supabase, we want a clean down-migration. The dedup is not reversed because the duplicates are data corruption — restoring them would be wrong.

### R-6 — Client-side defensive guard

**Decision**: Add a small `useProgress` post-processor that, given the (now-impossible) case of duplicate rows by `section_id`, deterministically picks the row with the most-recent `last_activity_at`. This is belt-and-suspenders after the DB fix and protects against any legacy data we haven't touched.

**Rationale**: Cheap (one `sort` + dedup in JS, < 10 lines), guards against environmental drift (e.g. a teammate's local DB without the migration), and gives `CourseHome.progressMap` a stable mapping.

---

## 6. Phase 1 — Design Artifacts

This is a small fix; the migration file IS the contract. No new `data-model.md` entries needed (column shapes unchanged). No new `contracts/*.md` (the constraint signature change is in the migration itself).

### 6.1 Files added

```text
db/migrations/
└── 013_fix_progress_nulls.sql              # NEW — dedup, NULLS NOT DISTINCT, trigger swap, backfill
db/tests/
├── 013_null_session_unique.sql             # NEW — RED then GREEN: upsert under session_id IS NULL updates
└── 013_progress_trigger_info_exclusion.sql # NEW — RED then GREEN: info exercise NOT counted in v_total
supabase/migrations/
└── 2026MMDDhhmmss_013_fix_progress_nulls.sql  # NEW — mirror copy
```

### 6.2 Files modified

```text
src/hooks/useProgress.ts                    # MOD — dedupe by section_id, keep newest by last_activity_at
src/hooks/useProgress.test.ts               # MOD — add a test covering duplicate-row input
```

### 6.3 Migration shape (`013_fix_progress_nulls.sql`)

```sql
BEGIN;

-- 1. Dedup responses (keep most-recent per key).
DELETE FROM public.responses r USING public.responses r2
WHERE r.participant_id = r2.participant_id
  AND r.exercise_id    = r2.exercise_id
  AND r.session_id IS NOT DISTINCT FROM r2.session_id
  AND (r.updated_at, r.id) < (r2.updated_at, r2.id);

-- 2. Dedup progress (keep most-recent per key).
DELETE FROM public.progress p USING public.progress p2
WHERE p.participant_id = p2.participant_id
  AND p.section_id     = p2.section_id
  AND p.session_id IS NOT DISTINCT FROM p2.session_id
  AND (p.last_activity_at, p.id) < (p2.last_activity_at, p2.id);

-- 3. Swap the table-level unique constraints for unique indexes with NULLS NOT DISTINCT.
ALTER TABLE public.responses DROP CONSTRAINT IF EXISTS responses_participant_id_exercise_id_session_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS responses_unique_key
  ON public.responses (participant_id, exercise_id, session_id) NULLS NOT DISTINCT;

ALTER TABLE public.progress DROP CONSTRAINT IF EXISTS progress_participant_id_section_id_session_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS progress_unique_key
  ON public.progress (participant_id, section_id, session_id) NULLS NOT DISTINCT;

-- 4. Trigger update: exclude info exercises from v_total and v_completed.
CREATE OR REPLACE FUNCTION public.update_progress_on_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_section_id   uuid;
  v_total        integer;
  v_completed    integer;
  v_completed_at timestamptz;
BEGIN
  SELECT e.section_id INTO v_section_id FROM public.exercises e WHERE e.id = NEW.exercise_id;

  SELECT COUNT(*) INTO v_total
  FROM public.exercises e
  WHERE e.section_id = v_section_id AND e.type <> 'info';

  SELECT COUNT(*) INTO v_completed
  FROM public.responses r
  JOIN public.exercises e ON e.id = r.exercise_id
  WHERE r.participant_id = NEW.participant_id
    AND e.section_id = v_section_id
    AND e.type <> 'info'
    AND r.session_id IS NOT DISTINCT FROM NEW.session_id
    AND r.is_complete = true;

  v_completed_at := CASE WHEN v_total > 0 AND v_completed >= v_total THEN now() ELSE NULL END;

  INSERT INTO public.progress (
    participant_id, section_id, session_id,
    completed_exercises, total_exercises,
    section_completed_at, last_exercise_id, last_activity_at
  ) VALUES (
    NEW.participant_id, v_section_id, NEW.session_id,
    v_completed, v_total,
    v_completed_at, NEW.exercise_id, now()
  )
  ON CONFLICT (participant_id, section_id, session_id) DO UPDATE SET
    completed_exercises  = EXCLUDED.completed_exercises,
    total_exercises      = EXCLUDED.total_exercises,
    section_completed_at = EXCLUDED.section_completed_at,
    last_exercise_id     = EXCLUDED.last_exercise_id,
    last_activity_at     = EXCLUDED.last_activity_at;

  RETURN NEW;
END;
$$;

-- 5. Backfill: recompute progress fields against current responses for every surviving row.
WITH agg AS (
  SELECT
    p.id AS progress_id,
    COUNT(*) FILTER (WHERE r.is_complete AND e.type <> 'info') AS v_completed,
    (SELECT COUNT(*) FROM public.exercises e2
       WHERE e2.section_id = p.section_id AND e2.type <> 'info') AS v_total
  FROM public.progress p
  LEFT JOIN public.responses r
    ON r.participant_id = p.participant_id
   AND r.session_id IS NOT DISTINCT FROM p.session_id
  LEFT JOIN public.exercises e
    ON e.id = r.exercise_id AND e.section_id = p.section_id
  GROUP BY p.id, p.section_id
)
UPDATE public.progress p
SET completed_exercises  = agg.v_completed,
    total_exercises      = agg.v_total,
    section_completed_at = CASE
      WHEN agg.v_total > 0 AND agg.v_completed >= agg.v_total THEN COALESCE(p.section_completed_at, now())
      ELSE NULL
    END
FROM agg
WHERE p.id = agg.progress_id;

COMMIT;
```

### 6.4 Test shape (extends `db/tests/004_progress_trigger.sql` pattern)

- **013_null_session_unique.sql** — inserts two responses with the same `(participant_id, exercise_id, session_id=NULL)` via the supabase-js upsert pattern; asserts only ONE row exists after.
- **013_progress_trigger_info_exclusion.sql** — seeds a fake section with one info + one checkbox exercise; completes only the checkbox; asserts `progress.section_completed_at IS NOT NULL` and `progress.total_exercises = 1`.

### 6.5 Client guard (`src/hooks/useProgress.ts`)

```typescript
// After fetch, before setProgress(...):
const dedup = new Map<string, Progress>()
for (const p of data ?? []) {
  const existing = dedup.get(p.section_id)
  if (!existing || (p.last_activity_at ?? '') > (existing.last_activity_at ?? '')) {
    dedup.set(p.section_id, p)
  }
}
setProgress(Array.from(dedup.values()))
```

---

## 7. Rollout Sequence

| # | Step | Reversible? |
|---|------|-------------|
| 1 | Author migration + tests (this commit). | yes |
| 2 | Run `npx vitest` — confirm client-side tests pass (new useProgress dedupe test). | yes |
| 3 | Show migration to user for review. | yes |
| 4 | Apply migration to Supabase via `mcp__plugin_supabase_supabase__apply_migration` after explicit user approval. | partially — dedup is permanent; trigger/index changes are reversible via 013_down. |
| 5 | Re-run the diagnostic queries (`SELECT COUNT(*) … GROUP BY`) to confirm 1 row per `(participant, section, NULL)`. | n/a |
| 6 | Manually verify in the UI that Values is locked for the affected participant. | n/a |
| 7 | Commit migration + tests + client guard. | yes |

---

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Dedup picks the "wrong" row when two have identical `updated_at`. | Tie-break on `id`. |
| Backfill flips a section from "complete" back to "incomplete" for a participant who genuinely finished it (false negative). | Only happens if duplicate responses contributed to the inflated count; the post-dedup count IS the legitimate state. Pre-flight query in Step 5 surfaces any participant whose state changes — review before commit. |
| Supabase `apply_migration` runs outside a transaction wrapper. | Migration uses explicit `BEGIN/COMMIT`; any error aborts the whole block. |
| RLS denies the `DELETE` during dedup. | The migration runs as the migration role (bypass-RLS). Verified — no policy guards `DELETE` for the service role. |
| Future ad-hoc inserts via the SQL editor with `session_id = NULL` won't be deduped automatically. | The new unique index prevents fresh duplicates entirely. |

---

## 9. Complexity Tracking

No new entries. The parent plan's `Complexity Tracking` table remains authoritative. This sub-plan removes complexity (the silent NULL-uniqueness footgun) rather than adding any.

---

## 10. References

- Iteration 4 plan: [plan.md](plan.md)
- Bug discovery thread: `specs/003-slide-nav-ux-rework/tasks.md` (slide-nav UX task list — bug surfaced while testing T029 60-fps spot-check)
- Postgres `NULLS NOT DISTINCT` (PG 15+): https://www.postgresql.org/docs/15/sql-createtable.html#SQL-CREATETABLE-UNIQUE
- Migration 004 (the source of the bug): `db/migrations/004_responses_progress.sql`
- Constitution v1.0.0 §II Test-First: `.specify/memory/constitution.md`
