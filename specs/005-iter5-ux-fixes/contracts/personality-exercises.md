# Contract — Personality section exercises (after migration 015)

Authoritative row inventory for `exercises WHERE section_id = (SELECT id FROM sections WHERE slug='personality')` after `015_personality_quiz.sql` lands.

The section row itself (`sections WHERE slug='personality'`) is **byte-identical** to its `004-content-restructure` state. Only `exercises` rows change.

---

## Row 1 — `disc-introduction` (info, unchanged)

- `slug`: `disc-introduction`
- `title`: `D.I.S.C. — Discovering My Personal Behavioural Design`
- `type`: `info`
- `order_index`: 1
- `slide_group`: 1
- `is_scored`: false
- `attribution`: `(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)`
- `content_json`: **byte-identical to current**

---

## Row 2 — `core-style-q1-extroversion` (checkbox, NEW)

- `slug`: `core-style-q1-extroversion`
- `title`: `EXERCISE: Core Style — Question 1 (Extroversion)`
- `type`: `checkbox`
- `order_index`: 2
- `slide_group`: 2
- `is_scored`: true
- `attribution`: `(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)`
- `content_json`:
  ```json
  {
    "prompt": "Question 1: Are you predominantly EXTROVERTED or INTROVERTED?",
    "options": [
      { "id": "q1_extroverted", "label": "Extroverted — I gain energy from interacting with people and the outside world.", "value": 1 },
      { "id": "q1_introverted", "label": "Introverted — I gain energy from quiet reflection and my inner world.", "value": 1 }
    ],
    "allow_multiple": false
  }
  ```

**Workbook source**: `psp_content.md:414`.

---

## Row 3 — `core-style-q2-orientation` (checkbox, NEW)

- `slug`: `core-style-q2-orientation`
- `title`: `EXERCISE: Core Style — Question 2 (Orientation)`
- `type`: `checkbox`
- `order_index`: 3
- `slide_group`: 2
- `is_scored`: true
- `attribution`: same as Row 2
- `content_json`:
  ```json
  {
    "prompt": "Question 2: Are you predominantly PEOPLE-ORIENTED or TASK-ORIENTED?",
    "options": [
      { "id": "q2_people", "label": "People-oriented — I focus on relationships, collaboration, and how people feel.", "value": 1 },
      { "id": "q2_task", "label": "Task-oriented — I focus on results, structure, and getting things done.", "value": 1 }
    ],
    "allow_multiple": false
  }
  ```

**Workbook source**: `psp_content.md:415`.

---

## Row 4 — `core-style-result` (info, NEW — Path A: template substitution)

- `slug`: `core-style-result`
- `title`: `Your Core Style`
- `type`: `info`
- `order_index`: 4
- `slide_group`: 3
- `is_scored`: false
- `attribution`: same as Row 2
- `content_json`:
  ```json
  {
    "content": "Based on your two answers, your Core Style maps to:\n\nExtroverted + Task-oriented = Core D — Dominance\nExtroverted + People-oriented = Core I — Influence\nIntroverted + People-oriented = Core S — Steadiness\nIntroverted + Task-oriented = Core C — Compliance\n\n{result}",
    "computed": "core_style",
    "computed_inputs": ["core-style-q1-extroversion", "core-style-q2-orientation"]
  }
  ```

**Renderer extension (minimal)**: `SectionPage.renderExercise()` for `type==='info'` checks for `content.computed === 'core_style'`. If present, it reads the two upstream responses from the `responses` map, calls `mapCoreStyle(q1, q2)` from `src/lib/coreStyle.ts`, and substitutes `{result}` in the content string with the resolved sentence (e.g., `"Your Core Style is **D — Dominance**."`). If either response is missing, substitute with `"Answer both questions above to see your Core Style."`.

**Workbook source**: `psp_content.md:417–432`.

---

## Rows 5–8 — `disc-profile-{d,i,s,c}` (info, NEW read-throughs)

Each is an info exercise presenting one Core Style's strengths + ideal environment + characteristics + comfort zone as **read-through prose**, **not** as checkbox lists.

| # | slug | order_index | slide_group | workbook source |
|---|---|---|---|---|
| 5 | `disc-profile-d` | 5 | 4 | `psp_content.md:468–536` |
| 6 | `disc-profile-i` | 6 | 4 | `psp_content.md:540–614` |
| 7 | `disc-profile-s` | 7 | 5 | `psp_content.md:618–680` |
| 8 | `disc-profile-c` | 8 | 5 | `psp_content.md:684–747` |

All four share `is_scored=false`, `type='info'`, and the attribution string. `content_json.content` is structured as:

```
HIGH {D|I|S|C} — {Style Name}

Strengths
{prose summarising the strengths bullets from the workbook}

Ideal environment
{prose summarising the ideal-environment bullets}

Characteristics
{prose summarising the characteristics checklist}

Comfort zone
{prose paragraph derived from "YOUR COMFORT ZONES" + relevant style-specific notes}
```

Authoring rule: prefer 2–4 paragraphs over bullet lists. Where the workbook uses a 17-item checklist (e.g., HIGH D's "Characteristics Checklist"), the prose may summarise to 4–6 representative traits with a "such as ..." clause. **No checkboxes** anywhere in these four rows.

---

## Row 9 — `my-core-style` (text, preserved from 004)

- `slug`: `my-core-style`
- `title`: `My Core Style — People Reading`
- `type`: `text` *(single textarea — confirmed in `db/seeds/course-content.json:650` and `specs/004-content-restructure/contracts/group-section-mapping.md:82`)*
- `order_index`: 9 *(UPDATEd from current `7`; row identity preserved via slug)*
- `slide_group`: 6 *(UPDATEd from current `NULL`; row identity preserved via slug)*
- `is_scored`: false *(matches current; the reflection exercise has never been gated)*
- `attribution`: `null` *(matches current; this exercise is a participant reflection, not adapted from Target Training)*
- `content_json`: **byte-identical to current** (the single-`text` prompt sourced from `psp_content.md:436–446`)

---

## Removed rows (4)

| slug | type | rationale |
|---|---|---|
| `disc-core-style-d` | checkbox | Replaced by `disc-profile-d` (info read-through). |
| `disc-core-style-i` | checkbox | Replaced by `disc-profile-i`. |
| `disc-core-style-s` | checkbox | Replaced by `disc-profile-s`. |
| `disc-core-style-c` | checkbox | Replaced by `disc-profile-c`. |

Their `responses` rows are wiped by the same migration (FK cascade — verified in `contracts/migration-015.md`).

---

## Invariants

- **I1**: Personality section MUST have exactly **9** exercise rows post-migration.
- **I2**: `order_index` MUST be `1..9`, dense, with no gaps.
- **I3**: `slide_group` values MUST be `{1, 2, 3, 4, 5, 6}` with the grouping above.
- **I4**: All four `disc-profile-*` rows AND both `core-style-q{1,2}-*` rows AND `core-style-result` MUST carry the Target Training attribution string verbatim. (`my-core-style` is a participant-reflection prompt and retains its `attribution: null` from the current seed.)
- **I5**: The two-question quiz rows (`core-style-q1-*`, `core-style-q2-*`) MUST have `allow_multiple: false` and exactly two options each.
- **I6**: No row in the new Personality vocabulary has `type='checkbox'` with `allow_multiple: true`.
- **I7**: `my-core-style` row's `content_json` is byte-identical to its current (`004-content-restructure`) state; only its `order_index` and `slide_group` columns change.
- **I8**: `core-style-result.content_json.computed` MUST be `"core_style"` and `computed_inputs` MUST list both quiz slugs.
