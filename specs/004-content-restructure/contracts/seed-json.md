# Contract: `db/seeds/course-content.json` Schema

**Feature**: 004-content-restructure
**Enforced by**: `scripts/validate-seed.ts` (CI + precommit) and `scripts/validate-seed.test.ts` (Vitest)

This contract is **authoritative** for the seed file shape. Anything not described here is forbidden.

---

## Top-level shape

```jsonc
{
  "sections": [
    {
      "slug": "kebab-case",                  // required, unique
      "title": "Display Title",              // required, non-empty
      "subtitle": "optional subtitle",
      "description": "optional 1-2 sentence summary",
      "order_index": 1,                      // required, positive int, globally unique
      "group_slug": "self-awareness",        // required, ∈ GROUP_SLUGS
      "icon_name": "optional-lucide-icon-name",
      "framing": { /* optional, per Iter 4 spec */ },
      "exercises": [
        {
          "slug": "kebab-case",              // required, unique within section
          "title": "Display Title",          // required, non-empty
          "type": "structured-text",         // required, ∈ EXERCISE_TYPE
          "order_index": 1,                  // required, positive int, unique within section
          "slide_group": null,               // optional int, per Iter 4 spec
          "is_scored": false,                // optional, default false
          "attribution": "optional credit",
          "content_json": { /* shape varies per type — see below */ }
        }
      ]
    }
  ]
}
```

---

## Invariants enforced by `validate-seed.ts`

### I1 — Section count and group distribution
- Total section count: **exactly 9**.
- Distinct `group_slug` values: **exactly 3**, all ∈ `{ 'self-awareness', 'goal-setting', 'strategic-planning' }`.
- Section counts per group: 5 / 3 / 1 (in the order above).

### I2 — Order-index monotonicity
- All `order_index` values across all sections are globally unique and span `[1..N]` contiguously.
- For any two sections `a` and `b`: if `GROUP_META[a.group_slug].order < GROUP_META[b.group_slug].order`, then `a.order_index < b.order_index`.

### I3 — Slug constraints
- Section slugs match `/^[a-z][a-z0-9-]*[a-z0-9]$/`.
- Exercise slugs match the same pattern and are unique **within their parent section**.

### I4 — Exercise type vocabulary
- `exercise.type` ∈ `{ 'checkbox', 'text', 'table', 'ranking', 'info', 'structured-text', 'rating-picker' }`.

### I5 — Per-question contract (the new rule)

Applied to every exercise where `type ∈ { 'structured-text', 'text' }`:

- If `content_json.questions` is **absent** or has length `1`, the exercise is treated as single-prompt. `validate-seed.ts` records the exercise's `slug` and the IP review's annotated workbook-prompt count is the source of truth — mismatches block CI.
- If `content_json.questions.length >= 2`:
  - Each `questions[i]` carries: `id` (required), `prompt` (required, ≥ 5 chars), optional `placeholder`, optional `required: boolean` (default `true`), optional `max_length: int`.
  - Question `id`s are unique within the exercise.
  - If `content_json.combined === true`: a non-empty `content_json.combined_rationale` (≥ 20 chars) MUST be present.
  - If `combined` is absent or `false`: the exercise is asserted to "split mandatory prompts". The IP review's annotated workbook-prompt count for this exercise MUST equal `questions.length` (or be explicitly justified in the IP review document).

### I6 — `content_json` shape by exercise type

| Type | Required keys | Optional keys |
|---|---|---|
| `info` | `content` | `attribution` |
| `text` | `prompt` OR `questions[].length === 1` | `placeholder`, `min_length`, `max_length` |
| `structured-text` | `questions[].length >= 1` | `intro`, `combined`, `combined_rationale` |
| `checkbox` | `options[].length >= 1`, `allow_multiple: boolean` | `prompt` |
| `ranking` | `items[].length >= 2` | `prompt`, `interaction` |
| `table` | `headers[]`, `rows[]`, `col_types[]` | `prompt` |
| `rating-picker` | `items[].length >= 1`, `scale_min: int`, `scale_max: int` | `prompt`, `low_label`, `high_label` |

### I7 — Attribution preservation
- Any `exercise.attribution` string present in the legacy `course-content.json` MUST appear verbatim on the corresponding new exercise (by content equivalence; the legacy slug may differ).
- A diff-style audit appears in `db/seeds/ip-review.md`.

### I8 — IDs and ordering inside `questions[]`
- Question IDs are stable across reseeds (so external analytics can pivot reliably).
- Question render order follows array order.

---

## Failure mode

`validate-seed.ts` exits with code 1 and one error message per violation. Sample:

```
✖ section[2].exercises[3] (slug=removing-obstacles, type=structured-text):
    questions.length = 64, expected = 64 (matches IP review) — OK
✖ section[5].exercises[1] (slug=top-three-values, type=text):
    workbook has 3 mandatory prompts but content_json.questions is missing — promote to structured-text
✖ section[8].exercises[0] (slug=goal-introspection, type=structured-text):
    combined=true but combined_rationale is missing
```

CI fails on any line starting with `✖`.

---

## How the script is structured

```ts
// scripts/validate-seed.ts (sketch)
import { readFile } from 'node:fs/promises'

const path = process.argv[2] ?? 'db/seeds/course-content.json'
const seed = JSON.parse(await readFile(path, 'utf-8'))
const errors: string[] = []

function assert(cond: unknown, msg: string) { if (!cond) errors.push(`✖ ${msg}`) }

// I1, I2, I3 …
// I5 (per-question contract):
for (const s of seed.sections) {
  for (const e of s.exercises) {
    if (e.type !== 'structured-text' && e.type !== 'text') continue
    const qs = e.content_json?.questions ?? []
    if (qs.length >= 2) {
      const combined = e.content_json.combined === true
      if (combined) {
        assert(typeof e.content_json.combined_rationale === 'string' &&
               e.content_json.combined_rationale.length >= 20,
               `${s.slug}/${e.slug}: combined=true requires combined_rationale (≥20 chars)`)
      }
      for (const q of qs) {
        assert(typeof q.id === 'string' && q.id.length > 0,
               `${s.slug}/${e.slug}: question.id required`)
        assert(typeof q.prompt === 'string' && q.prompt.length >= 5,
               `${s.slug}/${e.slug}: question[${q.id}].prompt must be ≥5 chars`)
      }
    }
  }
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log(`✓ ${seed.sections.length} sections, ${seed.sections.flatMap(s=>s.exercises).length} exercises — clean.`)
```

The Vitest mirror (`scripts/validate-seed.test.ts`) imports the same assert-loop wrapped in a function so individual rules can be tested with synthetic input.
