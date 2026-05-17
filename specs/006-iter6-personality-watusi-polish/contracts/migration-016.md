# Contract — Migration 016 (Personality Deep-Dive + WATUSI sorted mode)

## Generator

`scripts/build-migration-016.ts` reads `db/seeds/course-content.json` and emits both:

- `db/migrations/016_personality_deep_dive.sql` (canonical, source of truth)
- `supabase/migrations/20260518000000_016_personality_deep_dive.sql` (Supabase CLI mirror)

Generation pattern mirrors `build-migration-015.ts` (single source of truth, dollar-quoted JSONB literals).

## Operations (in order)

1. **DELETE responses for newly-introduced exercises** (safety; should be no-op on first run, idempotent on re-run):

   ```sql
   DELETE FROM responses WHERE exercise_id IN (
     SELECT id FROM exercises WHERE slug IN (
       'core-style-characteristics',
       'core-style-ideal-environment',
       'core-style-traits-checklist',
       'core-style-comfort-zones'
     )
   );
   ```

2. **DELETE the four new rows** (idempotent on re-run; ON CONFLICT below would also handle this, but explicit DELETE keeps `created_at` semantics consistent on test resets):

   ```sql
   DELETE FROM exercises WHERE section_id =
     (SELECT id FROM sections WHERE slug = 'personality')
     AND slug IN (
       'core-style-characteristics',
       'core-style-ideal-environment',
       'core-style-traits-checklist',
       'core-style-comfort-zones'
     );
   ```

3. **UPSERT four new rows** with the seed-provided `content_json`, `attribution`, `slide_group`, `order_index`:

   ```sql
   INSERT INTO exercises (section_id, slug, title, type, content_json, order_index, slide_group, is_scored, attribution)
   VALUES ($1, 'core-style-characteristics', ..., 'info', $jsonb$ ... $jsonb$::jsonb, 9, 7, false, $tti_attribution$)
   ON CONFLICT (section_id, slug) DO UPDATE SET
     title = EXCLUDED.title,
     type = EXCLUDED.type,
     content_json = EXCLUDED.content_json,
     order_index = EXCLUDED.order_index,
     slide_group = EXCLUDED.slide_group,
     is_scored = EXCLUDED.is_scored,
     attribution = EXCLUDED.attribution;
   ```

4. **Soft-hide `my-core-style`**:

   ```sql
   UPDATE exercises
      SET slide_group = NULL,
          order_index = 99
    WHERE slug = 'my-core-style'
      AND section_id = (SELECT id FROM sections WHERE slug = 'personality');
   ```

5. **Flip `attitude-types-watusi` to sorted mode**:

   ```sql
   UPDATE exercises
      SET content_json = jsonb_set(content_json, '{interaction}', '"sorted"'::jsonb)
    WHERE slug = 'attitude-types-watusi';
   ```

## Idempotency invariants

Run the migration TWICE. After the second run, the following SQL queries MUST return identical results to the first run:

```sql
-- 9 sections, 39 exercises (35 from iter5 + 4 new; my-core-style soft-hidden still counted)
SELECT COUNT(*) FROM sections;        -- 9
SELECT COUNT(*) FROM exercises;       -- 39

-- The four new rows have correct attribution
SELECT slug, attribution FROM exercises WHERE slug LIKE 'core-style-%'
  AND slug NOT IN ('core-style-q1-extroversion','core-style-q2-orientation','core-style-result','core-style-characteristics','core-style-ideal-environment','core-style-traits-checklist','core-style-comfort-zones')
  ORDER BY slug;
-- Expected: empty (no other core-style-* rows beyond the listed)

SELECT slug, attribution FROM exercises
 WHERE slug IN ('core-style-characteristics','core-style-ideal-environment','core-style-traits-checklist','core-style-comfort-zones');
-- All 4 rows: attribution = TTI string

-- my-core-style is soft-hidden
SELECT slug, slide_group, order_index FROM exercises WHERE slug = 'my-core-style';
-- slide_group: NULL, order_index: 99

-- WATUSI in sorted mode
SELECT content_json->>'interaction' FROM exercises WHERE slug = 'attitude-types-watusi';
-- 'sorted'
```

## RED test BEFORE migration applies

`db/tests/016_deep_dive_exercises_invariants.sql` asserts the post-state. Run pre-migration → FAILS (the four rows don't exist; WATUSI is still `drag`). Run post-migration → PASSES.

`db/tests/016_idempotency.sql` runs the migration twice and asserts the invariants are stable.

## FK considerations

- `responses.exercise_id → exercises.id` is NOT `ON DELETE CASCADE` (per migration 004). The explicit step 1 DELETE handles this for the four NEW rows safely.
- The `my-core-style` row is NOT deleted; its responses remain intact.

## Rollback

Not provided. Forward-only migration. If rollback is needed:

1. Restore `my-core-style.slide_group` and `order_index` from the pre-migration backup.
2. Flip WATUSI back to `interaction: 'drag'`.
3. Optionally delete the four new exercise rows (and their cascade-cleaned responses).

## Validation

Before merge, run:

- `pnpm tsx scripts/validate-seed.ts` → reports 9 sections, 39 exercises, clean.
- `pnpm tsx scripts/build-migration-016.ts` → regenerates SQL files.
- Apply migration to a Supabase branch → run `db/tests/016_*.sql` against it → all GREEN.
