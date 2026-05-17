# Contract — Exercise Types (Iteration 4 additions)

These contracts describe the JSON shapes for the new and extended exercise types. They are the source of truth for `db/seeds/course-content.json` content and for the React renderer prop shapes.

---

## 1. `structured-text`

### Content (`exercises.content_json`)

```json
{
  "prompt": "Answer each of the following 14 questions as honestly and fully as possible. This inventory helps you identify the experiences, influences, and patterns that have shaped who you are today.",
  "questions": [
    {
      "id": "q1",
      "label": "Who have been the most influential people in your life, and in what way?",
      "placeholder": "Names, roles, and how each shaped you…",
      "min_length": 20,
      "max_length": 500
    },
    {
      "id": "q2",
      "label": "What were the critical incidents (events) that made you who you are?",
      "min_length": 20,
      "max_length": 500
    }
    // … q3 through q14
  ]
}
```

### Response (`responses.response_json`)

```json
{
  "answers": {
    "q1": "My grandfather, who taught me that listening matters more than speaking…",
    "q2": "Moving cities at age 11…",
    "q3": ""
  },
  "_legacy": "(optional) original free-text answer carried over from iteration 1/2"
}
```

### Completion rule
Complete iff for every question `q` in content, `len(trim(answers[q.id])) >= (q.min_length ?? 1)`.

### React renderer shape

```ts
interface StructuredTextExerciseProps {
  exerciseId: string
  content: StructuredTextContent
  initialResponse?: StructuredTextResponse | null
  participantId: string
  sessionId?: string | null
  readOnly?: boolean
}
```

---

## 2. `rating-picker`

### Content

```json
{
  "prompt": "Rate each skill on a scale of 1 (Strongly Disagree) to 5 (Strongly Agree) to indicate how strongly it applies to you.",
  "scale": {
    "min": 1,
    "max": 5,
    "labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
  },
  "items": [
    { "id": "skill_analyzing", "label": "Analyzing — break down complex information into parts" },
    { "id": "skill_communicating", "label": "Communicating — express ideas clearly in writing or speech" }
  ]
}
```

### Response

```json
{ "ratings": { "skill_analyzing": 4, "skill_communicating": 5 } }
```

### Completion rule
Complete iff for every item `it` in content, `ratings[it.id]` is a number in `[scale.min, scale.max]`.

---

## 3. `ranking` — extended with `interaction` and `derives_from`

### Content (additions only — existing fields unchanged)

```json
{
  "prompt": "Rank the six attitude types based on your checklist results, from your highest count to your lowest.",
  "items": [
    { "id": "attitude_w", "label": "W — The Theoretical Attitude" },
    { "id": "attitude_a", "label": "A — The Aesthetic Attitude" }
    // …
  ],
  "interaction": "drag",
  "derives_from": {
    "source_exercise_slug": "attitude-types-checklist",
    "group_by": "id_prefix"
  },
  "show_counts": true
}
```

`interaction` defaults to `"buttons"` (preserves existing UX).
`derives_from` is optional and currently only supports `group_by: "id_prefix"` — counts checklist item IDs by the substring before the first underscore (`w_1` → group `w`, etc.).
`show_counts: true` causes the renderer to display the count from `derives_from` beneath each ranked item.

Response shape unchanged: `{ "order": string[] }`.

---

## 4. `table` — extended with `currency` column type and `total_target`

### Content

```json
{
  "prompt": "You have $100,000 to spend in the PSP Value Boutique…",
  "headers": ["Amount Spent ($)", "Value"],
  "rows": 16,
  "col_types": ["currency", "text"],
  "total_target": 100000
}
```

### Response

```json
{
  "rows": [
    ["5000", "Family"],
    ["10000", "Health"]
  ],
  "total_spent": 15000
}
```

`total_spent` is computed by the renderer on every save and persisted alongside `rows`.

### Completion rule (unchanged)
A row is "filled" if any cell is non-empty. The exercise is `is_complete` once any row is filled. **Advance to next slide** additionally requires `total_spent === total_target` (gated by the next slide's Proceed button, not by `is_complete`).

---

## 5. `info` — unchanged

Listed here for reference. No changes in Iteration 4.

```json
{ "body_markdown": "…", "image_url": null }
```

---

## 6. Type-check constraint extension (DB)

```sql
alter table public.exercises drop constraint if exists exercises_type_check;
alter table public.exercises add constraint exercises_type_check
  check (type in ('checkbox','text','table','ranking','info','structured-text','rating-picker'));
```

(Captured in `db/migrations/011_exercise_slide_group.sql` for atomicity with the `slide_group` column addition.)
