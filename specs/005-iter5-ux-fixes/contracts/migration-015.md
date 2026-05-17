# Contract — Migration 015: Personality quiz content reshape

## Scope

Pure content mutation under the Personality section. **No DDL.** Schema is unchanged.

- **DELETE 5 rows** from `exercises` (verified row identities — see "Before" table in §Authoritative below):
  - `identifying-personal-style` (checkbox)
  - `disc-core-style-d`, `disc-core-style-i`, `disc-core-style-s`, `disc-core-style-c` (4 × checkbox)
- **Cascade-DELETE** all `responses` rows referencing those 5 exercise ids. (FK ON DELETE CASCADE established in Iter 1 migration 001 — verified in test 015.)
- **INSERT 7 new rows** into `exercises`:
  - `core-style-q1-extroversion` (checkbox)
  - `core-style-q2-orientation` (checkbox)
  - `core-style-result` (info, computed)
  - `disc-profile-d` (info)
  - `disc-profile-i` (info)
  - `disc-profile-s` (info)
  - `disc-profile-c` (info)
- **UPDATE 2 preserved rows** (slug identity unchanged; only `order_index` / `slide_group` shift):
  - `disc-introduction` (info) — `order_index` stays at 1; `slide_group` set to 1.
  - `my-core-style` (text) — `order_index` 7 → 9; `slide_group` NULL → 6.

Net row count: **7 before → 9 after**. The two preserved rows anchor the section's identity across migrations.

## Authoritative before/after row identities

**Before** (current Personality exercises — **7 rows**, verified via `db/seeds/course-content.json` and `specs/004-content-restructure/contracts/group-section-mapping.md:14,82`):

| order_index | slug | type | is_scored | attribution |
|---|---|---|---|---|
| 1 | `disc-introduction` | info | false | Target Training (verbatim) |
| 2 | `identifying-personal-style` | checkbox | true | Target Training (verbatim) |
| 3 | `disc-core-style-d` | checkbox | true | Target Training (verbatim) |
| 4 | `disc-core-style-i` | checkbox | true | Target Training (verbatim) |
| 5 | `disc-core-style-s` | checkbox | true | Target Training (verbatim) |
| 6 | `disc-core-style-c` | checkbox | true | Target Training (verbatim) |
| 7 | `my-core-style` | **text** | **false** | **NULL** |

Note: `my-core-style` is a single-textarea reflection prompt (NOT `structured-text`). It carries no attribution because it's a participant reflection, not adapted content. Both facts are preserved by migration 015 — only `order_index` and `slide_group` shift.

**After** (this contract — **9 rows**):

| order_index | slug | type | is_scored | attribution |
|---|---|---|---|---|
| 1 | `disc-introduction` | info | false | Target Training (preserved verbatim) |
| 2 | `core-style-q1-extroversion` | checkbox | true | Target Training (verbatim) |
| 3 | `core-style-q2-orientation` | checkbox | true | Target Training (verbatim) |
| 4 | `core-style-result` | info (computed) | false | Target Training (verbatim) |
| 5 | `disc-profile-d` | info | false | Target Training (verbatim) |
| 6 | `disc-profile-i` | info | false | Target Training (verbatim) |
| 7 | `disc-profile-s` | info | false | Target Training (verbatim) |
| 8 | `disc-profile-c` | info | false | Target Training (verbatim) |
| 9 | `my-core-style` | **text** | **false** | **NULL** (preserved; row identity unchanged via slug) |

## SQL outline (idempotent)

**Single source of truth**: the migration is generated from `db/seeds/course-content.json` via a small Node script (`scripts/build-migration-015.ts`, NEW under tasks.md T067). The seed is authoritative; the script emits the SQL with each `content_json` body inlined as a properly escaped `jsonb` literal. This avoids two-source drift between the seed and the migration. (Iter 1+3 migrations inline their content the same way.)

```sql
-- 015_personality_quiz.sql (generated)

BEGIN;

-- 1. Locate the Personality section id (must exist post-004).
WITH p AS (SELECT id FROM sections WHERE slug = 'personality')

-- 2. DELETE removed rows. Responses cascade via FK ON DELETE CASCADE.
DELETE FROM exercises
WHERE section_id = (SELECT id FROM p)
  AND slug IN (
    'identifying-personal-style',
    'disc-core-style-d',
    'disc-core-style-i',
    'disc-core-style-s',
    'disc-core-style-c'
  );

-- 3. UPSERT new + preserved rows. ON CONFLICT (section_id, slug) DO UPDATE
--    so the migration is idempotent. (Note: `my-core-style` is type `text`
--    with NULL attribution — it's a participant reflection, not adapted
--    content. `disc-introduction` and the 7 new rows carry the Target
--    Training attribution string verbatim.)
INSERT INTO exercises (section_id, slug, title, type, order_index, slide_group, is_scored, attribution, content_json)
VALUES
  ((SELECT id FROM p), 'disc-introduction',           'D.I.S.C. — Discovering My Personal Behavioural Design', 'info',     1, 1, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', '{...}'::jsonb),
  ((SELECT id FROM p), 'core-style-q1-extroversion',  'EXERCISE: Core Style — Question 1 (Extroversion)',      'checkbox', 2, 2, true,  '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', '{...}'::jsonb),
  ((SELECT id FROM p), 'core-style-q2-orientation',   'EXERCISE: Core Style — Question 2 (Orientation)',       'checkbox', 3, 2, true,  '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', '{...}'::jsonb),
  ((SELECT id FROM p), 'core-style-result',           'Your Core Style',                                       'info',     4, 3, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', '{...}'::jsonb),
  ((SELECT id FROM p), 'disc-profile-d',              'HIGH D — Dominance Profile',                            'info',     5, 4, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', '{...}'::jsonb),
  ((SELECT id FROM p), 'disc-profile-i',              'HIGH I — Influence Profile',                            'info',     6, 4, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', '{...}'::jsonb),
  ((SELECT id FROM p), 'disc-profile-s',              'HIGH S — Steadiness Profile',                           'info',     7, 5, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', '{...}'::jsonb),
  ((SELECT id FROM p), 'disc-profile-c',              'HIGH C — Compliance Profile',                           'info',     8, 5, false, '(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)', '{...}'::jsonb),
  ((SELECT id FROM p), 'my-core-style',               'My Core Style — People Reading',                        'text',     9, 6, false, NULL,                                                                                                                  '{...}'::jsonb)
ON CONFLICT (section_id, slug) DO UPDATE
SET title         = EXCLUDED.title,
    type          = EXCLUDED.type,
    order_index   = EXCLUDED.order_index,
    slide_group   = EXCLUDED.slide_group,
    is_scored     = EXCLUDED.is_scored,
    attribution   = EXCLUDED.attribution,
    content_json  = EXCLUDED.content_json,
    updated_at    = now();

COMMIT;
```

`content_json` bodies (`{...}` above) are emitted by `scripts/build-migration-015.ts` from the regenerated `db/seeds/course-content.json`. Re-running the script re-emits the migration deterministically. No drift possible.

## Idempotency proof

- Each DELETE is bounded by a fixed slug allow-list. Re-running it is a no-op once the rows are gone.
- Each INSERT is `ON CONFLICT (section_id, slug) DO UPDATE` — re-running it replaces with the same values, end state stable.
- `responses` rows reference `exercises(id)` via ON DELETE CASCADE (verified in Iter 1 schema migration 001). DELETEing an exercise row removes its responses transparently.

## Test plan

### `015_personality_exercises_invariants.sql` (RED before, GREEN after)

```sql
-- RED expectations (pre-migration):
SELECT count(*) FROM exercises e
JOIN sections s ON s.id = e.section_id
WHERE s.slug='personality' AND e.slug LIKE 'disc-core-style-%';
-- expected: 4

SELECT count(*) FROM exercises e
JOIN sections s ON s.id = e.section_id
WHERE s.slug='personality';
-- expected: 7

-- GREEN expectations (post-migration):
SELECT count(*) FROM exercises e
JOIN sections s ON s.id = e.section_id
WHERE s.slug='personality' AND e.slug LIKE 'disc-core-style-%';
-- expected: 0

SELECT count(*) FROM exercises e
JOIN sections s ON s.id = e.section_id
WHERE s.slug='personality';
-- expected: 9

SELECT slug FROM exercises e
JOIN sections s ON s.id = e.section_id
WHERE s.slug='personality'
ORDER BY order_index;
-- expected: ['disc-introduction','core-style-q1-extroversion','core-style-q2-orientation',
--           'core-style-result','disc-profile-d','disc-profile-i','disc-profile-s',
--           'disc-profile-c','my-core-style']

-- IP-attribution invariant (SC-IP-1):
-- Every Personality row EXCEPT the participant-reflection row carries the
-- Target Training attribution verbatim.
SELECT count(*) FROM exercises e
JOIN sections s ON s.id = e.section_id
WHERE s.slug='personality'
  AND e.slug <> 'my-core-style'
  AND (e.attribution IS NULL OR e.attribution NOT LIKE '%Target Training International%');
-- expected: 0

-- Type-preservation invariant for the participant-reflection row:
SELECT type, is_scored, attribution FROM exercises e
JOIN sections s ON s.id = e.section_id
WHERE s.slug='personality' AND e.slug='my-core-style';
-- expected: type='text', is_scored=false, attribution IS NULL
```

### `015_idempotency.sql`

```sql
\i ../migrations/015_personality_quiz.sql
\i ../migrations/015_personality_quiz.sql
-- expectation: identical state to applying once. SELECT count + slug-list assertions repeated.
```

### Application test

`scripts/validate-seed.ts` (from `004-content-restructure`) MUST accept the new Personality rows against the per-question contract. The `core-style-result.computed` field is new; the validator MUST be extended to accept `computed: "core_style"` on info-type exercises with a corresponding `computed_inputs: string[]` field.

## IP review checkpoint

Mandatory **`T-IP5-001`** task in tasks.md:

- Every new `disc-profile-*` info row's `attribution` field carries the verbatim Target Training International credit line.
- Every new quiz row carries the same attribution.
- `db/seeds/ip-review.md` is appended with an Iter-5 block listing the row slugs reviewed, the workbook page-equivalent for each, and the reviewer's initials + date.

Without sign-off on `T-IP5-001`, migration 015 MUST NOT be merged.
