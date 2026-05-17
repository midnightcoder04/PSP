# Data Model — Iter6

This iteration adds **four new exercise rows** to the Personality section, soft-removes **one row** (`my-core-style`), and adds an opt-in `interaction: 'sorted'` mode to the existing `ranking` exercise type.

No new tables. No column changes. All changes are within the existing `exercises.content_json` JSONB column + the existing `responses` table.

---

## Entities (unchanged from iter5)

- `sections` (rows: 9 — unchanged)
- `exercises` (rows: 35 → 39, with 1 row soft-hidden via `slide_group = NULL`)
- `responses` (no schema change; new `exercise_id` references for the four new rows)

---

## JSONB shapes — new

### `info` exercise with per-style content

```ts
type CoreStyleSectionContent = {
  /** Fallback prose when the quiz answers are missing. */
  content: string

  /** Triggers SectionPage's per-style render branch. */
  computed: 'core_style_section'

  /** [q1_id, q2_id] — exercise IDs (not slugs) of the two quiz questions. */
  computed_inputs: [string, string]

  /** Content body keyed by resolved style. Each value is the prose/markdown
   *  block to render via parseBlocks (supports numbered/bulleted lines). */
  sections_by_style: Record<'D' | 'I' | 'S' | 'C', string>

  /** Always preserved verbatim. */
  attribution?: string
}
```

Rendering rule:

- If both quiz responses present AND `resolveCoreStyleFromResponses(q1, q2)` returns a non-null `result` → render `sections_by_style[result]` via `parseBlocks`.
- Otherwise → render `content` (fallback) directing the participant back to the quiz.

### `checkbox` exercise with per-style options

```ts
type CoreStyleChecklistContent = {
  prompt: string
  allow_multiple: true
  computed: 'core_style_options'
  computed_inputs: [string, string]
  options_by_style: Record<
    'D' | 'I' | 'S' | 'C',
    { id: string; label: string; value?: number }[]
  >
}
```

Rendering rule:

- If both quiz responses present → render `options_by_style[result]` as the standard `CheckboxExercise` option list.
- Otherwise → render a non-interactive prompt directing the participant back to the quiz.

Response shape on save (unchanged from existing checkbox):

```json
{ "selected_ids": ["d_t1", "d_t3", "d_t10"] }
```

Option IDs are prefixed by the lowercase style letter (`d_*`, `i_*`, `s_*`, `c_*`) so that future analytics can group ticks by style without re-deriving from quiz answers.

### `ranking` exercise with sorted interaction

```ts
type SortedRankingContent = {
  prompt: string
  interaction: 'sorted'         // NEW value
  show_counts: true
  derives_from: { source_exercise_slug: string; group_by: 'id_prefix' }
  items: { id: string; label: string }[]
}
```

Rendering rule:

- `interaction === 'sorted'` → read-only branch:
  - No drag context, no up/down buttons.
  - No `#` rank column.
  - Rows in `derived.order` order (already implemented).
  - Each row: label + count chip (`margin-left: auto`).
  - Auto-complete-on-mount: if no response exists, save `{ order: derivedOrder }` with `is_complete: true` once.
  - `role="list"`, each row `role="listitem"` with `aria-label="{rank}. {label}, count {count}"`.

---

## Seed changes

### New Personality section rows (additive)

| slug | type | slide_group | order_index | attribution | notes |
|---|---|---|---|---|---|
| `core-style-characteristics` | info | 7 | 9 | TTI | per-style "If you are HIGH X, you..." bullets |
| `core-style-ideal-environment` | info | 8 | 10 | TTI | per-style "IDEAL ENVIRONMENT FOR THE HIGH X" bullets |
| `core-style-traits-checklist` | checkbox | 9 | 11 | TTI | optional traits checklist, allow_multiple, per-style options_by_style |
| `core-style-comfort-zones` | info | 10 | 12 | TTI | per-style "COMFORT ZONES for HIGH X" pairs |

### Soft-removed row

| slug | change | rationale |
|---|---|---|
| `my-core-style` | `slide_group: NULL`, `order_index: 99` | Preserve FK integrity for iter5 responses; exclude from rendered slide track. |

### Modified row

| slug | change |
|---|---|
| `attitude-types-watusi` | `interaction: 'sorted'` (was `'drag'`) — opts into read-only mode. |

---

## Migration delta

See `contracts/migration-016.md` for the full SQL invariants. Brief:

```sql
-- DELETE prior responses ONLY for newly-introduced exercises (safety; should be no rows on first run)
DELETE FROM responses WHERE exercise_id IN (
  SELECT id FROM exercises WHERE slug IN (
    'core-style-characteristics', 'core-style-ideal-environment',
    'core-style-traits-checklist', 'core-style-comfort-zones'
  )
);

-- UPSERT the four new rows (idempotent on (section_id, slug))
INSERT INTO exercises (...) VALUES (...)
ON CONFLICT (section_id, slug) DO UPDATE SET ...;

-- Soft-hide my-core-style
UPDATE exercises
   SET slide_group = NULL, order_index = 99
 WHERE slug = 'my-core-style'
   AND section_id = (SELECT id FROM sections WHERE slug = 'personality');

-- Flip WATUSI ranking to sorted mode (content_json patch)
UPDATE exercises
   SET content_json = jsonb_set(content_json, '{interaction}', '"sorted"'::jsonb)
 WHERE slug = 'attitude-types-watusi';
```

---

## Validation rules

- `sections_by_style` MUST have all four keys `D`, `I`, `S`, `C` populated with non-empty strings (validated by `scripts/validate-seed.ts`).
- `options_by_style` MUST have all four keys populated with arrays whose lengths match the source HIGH-X Characteristics Checklists in `psp_content.md`: **D=17, I=16, S=18, C=19** (exact counts, not "at least"). Validation rejects any deviation so accidental option drops surface at seed-validation time.
- Every new exercise row MUST carry the TTI attribution string verbatim:
  `(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)`
- `interaction: 'sorted'` is only valid when `derives_from` is also set; otherwise the sort is undefined.
