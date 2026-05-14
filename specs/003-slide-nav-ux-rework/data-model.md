# Data Model — Iteration 4 (003-slide-nav-ux-rework)

This document captures the new and changed entities for Iteration 4. JSONB shapes are TypeScript-typed; the DB column itself does not change.

---

## 1. New Table: `testimonials`

```sql
create table public.testimonials (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references public.profiles(id) on delete cascade,
  session_id      uuid not null references public.sessions(id) on delete restrict,
  content         text not null check (length(content) between 50 and 1500),
  rating          int  null check (rating between 1 and 5),
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (participant_id, session_id)
);

create index testimonials_session_id_idx       on public.testimonials(session_id);
create index testimonials_participant_id_idx   on public.testimonials(participant_id);

alter table public.testimonials enable row level security;
-- policies: see research.md R9 and contracts/testimonials-api.md
```

**Field semantics**:

| Column | Purpose |
|--------|---------|
| `participant_id` | Author. FK → `profiles.id`. |
| `session_id` | Implicit facilitator link via `sessions.facilitator_id`. Pinned at submission time so a later enrollment change doesn't relabel an existing testimonial. |
| `content` | Free text 50–1 500 chars. Hard length cap so abuse vectors (huge writes) are bounded; minimum so empty/trivial submissions are blocked at DB. |
| `rating` | Optional 1–5 stars. |
| `submitted_at` / `updated_at` | Standard audit. `updated_at` is set by trigger on UPDATE. |

**Trigger** (mirrors existing `responses_updated_at` pattern):

```sql
create trigger testimonials_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();
```

**TypeScript shape** (added to `database.ts`):

```ts
testimonials: {
  Row: {
    id: string
    participant_id: string
    session_id: string
    content: string
    rating: number | null
    submitted_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    participant_id: string
    session_id: string
    content: string
    rating?: number | null
    submitted_at?: string
    updated_at?: string
  }
  Update: {
    content?: string
    rating?: number | null
    updated_at?: string
  }
  Relationships: [
    { foreignKeyName: 'testimonials_participant_id_fkey'; columns: ['participant_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
    { foreignKeyName: 'testimonials_session_id_fkey';     columns: ['session_id'];     isOneToOne: false; referencedRelation: 'sessions';  referencedColumns: ['id'] },
  ]
}

export type Testimonial = Tables<'testimonials'>
```

---

## 2. Modified Table: `exercises` — new `slide_group` column

```sql
alter table public.exercises
  add column slide_group int null;

-- Backfill: each existing exercise becomes its own slide group, ordered as currently.
update public.exercises set slide_group = order_index where slide_group is null;

-- Going forward, NULL is allowed and falls back to order_index at the application layer
-- to keep the migration non-breaking even if a future seed forgets the field.
```

**Field semantics**: Two exercises in the same `(section_id, slide_group)` render on a single slide. Default = `order_index` (each exercise is its own slide).

**Seed pairing for WATUSI** (db/seeds/course-content.json):

```json
{ "slug": "attitude-types-checklist",   "slide_group": 3 }
{ "slug": "attitude-types-watusi",       "slide_group": 3 }
```

(both currently have `order_index: 2` and `3`; the seed updates one of them so they share `slide_group: 3`.)

---

## 3. Extended JSONB: `sections.framing.reading_material`

```ts
interface SectionFraming {
  opening_quote: { text: string; attribution: string }
  opening_question: string
  facilitator_says: string
  why_it_matters: string
  closing_reflection: string
  bridge_to_next: string | null
  reading_material?: {
    title: string
    content: string
    url?: string
  } | null
}
```

Backwards compatible: absent on existing rows, treated as `undefined`/null on read.

---

## 4. Extended JSONB: `exercises.content_json` for `ranking`

```ts
interface RankingContent {
  prompt: string
  items: { id: string; label: string }[]
  interaction?: 'drag' | 'buttons'      // default 'buttons'
  derives_from?: {
    source_exercise_slug: string         // e.g. 'attitude-types-checklist'
    group_by: 'id_prefix'                // future-proofed; only 'id_prefix' for now
  }
  show_counts?: boolean                  // if true, render count badge beneath each item
}
```

Response shape unchanged: `{ order: string[] }`.

---

## 5. New exercise type: `structured-text`

**Content**:

```ts
interface StructuredTextContent {
  prompt: string
  questions: {
    id: string                // e.g. 'q1', 'article_1', 'dimension_self'
    label: string             // e.g. 'Who have been the most influential people in your life?'
    placeholder?: string
    min_length?: number       // default 1
    max_length?: number       // default 1000
  }[]
}
```

**Response**:

```ts
interface StructuredTextResponse {
  answers: Record<string, string>     // by question id
  _legacy?: string                    // optional carry-over of previous free-text answer
}
```

**Completion predicate** (`lib/exerciseCompletion.ts`):

```ts
function isStructuredTextComplete(content: StructuredTextContent, response: StructuredTextResponse | null): boolean {
  if (!response) return false
  return content.questions.every(q =>
    (response.answers[q.id]?.trim().length ?? 0) >= (q.min_length ?? 1)
  )
}
```

**Seed mapping** (db/seeds/course-content.json):

| Exercise | Question slots |
|----------|----------------|
| `past-experience-inventory` | 14 questions, labels taken from current `content_json.prompt` |
| `contract-with-myself` | 6 articles (`article_1` … `article_6`) |
| `mission-statement` | 5 dimensions (`vision`, `self`, `others`, `world`, `one_sentence`) |

The original prompt strings remain as `content.prompt` to preserve framing.

---

## 6. New exercise type: `rating-picker`

**Content**:

```ts
interface RatingPickerContent {
  prompt: string
  scale: { min: number; max: number; labels?: string[] }   // typically min=1, max=5
  items: { id: string; label: string }[]                   // e.g. each transferable skill
}
```

**Response**:

```ts
interface RatingPickerResponse {
  ratings: Record<string, number>   // item.id → rating
}
```

**Completion predicate**:

```ts
function isRatingPickerComplete(content: RatingPickerContent, response: RatingPickerResponse | null): boolean {
  if (!response) return false
  const { min, max } = content.scale
  return content.items.every(it => {
    const r = response.ratings[it.id]
    return typeof r === 'number' && r >= min && r <= max
  })
}
```

**Seed mapping** (db/seeds/course-content.json):

| Exercise | Items |
|----------|-------|
| `determining-transferable-skills` | one item per skill (50–80 items based on the workbook list); scale 1–5 with labels `["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"]` |

---

## 7. Extended JSONB: `exercises.content_json` for `table` (Values Shopping Spree)

```ts
interface TableContent {
  prompt: string
  headers: string[]
  rows: number
  col_types?: ('text' | 'number' | 'currency')[]    // 'currency' is new
  total_target?: number                              // e.g. 100000; gates a follow-on Proceed slide
}

interface TableResponse {
  rows: string[][]
  total_spent?: number     // computed on save when any col is 'currency'
}
```

**Backwards compatibility**: `col_types` and `total_target` are optional; existing rows with `col_types: ['number','text']` continue to render as before.

---

## 8. Slide Navigation State Machine

```text
        ┌──────────────────────────────────────────────────────────────────────────┐
        │                                                                          │
   ─────┼──> currentSlide = -1     (intro slide)                                   │
        │       │                                                                  │
        │       │   right arrow (always enabled)                                   │
        │       ▼                                                                  │
        │   currentSlide = 0       (first slide group)                             │
        │       │  ▲                                                               │
        │       │  │ left arrow (always enabled when currentSlide > -1)            │
        │       │  │                                                               │
        │       │   right arrow (enabled iff every exercise in current slide_group │
        │       │      is is_complete, OR they are 'info'-type)                    │
        │       ▼                                                                  │
        │   currentSlide = 1                                                       │
        │       ...                                                                │
        │   currentSlide = N-1     (last slide group)                              │
        │       │                                                                  │
        │       │   right arrow → 'Finish section'                                 │
        │       ▼                                                                  │
        │   currentSlide = N       (closing slide)                                 │
        │       │                                                                  │
        │       │   on final section: 'Finish course' → /course/complete           │
        │       │   on other sections: 'Continue to next section' → /course/{next} │
        └──────────────────────────────────────────────────────────────────────────┘
```

Implemented by `useSlideState` (see contracts/slide-nav.md).

---

## 9. Section Lock State

```ts
type SectionLockState = {
  index: number
  section: Section
  isLocked: boolean
  prereq: Section | null     // section that must be completed to unlock; null for index 0
}
```

Derived via `useSectionLock({ sections, progressMap })`. Locked sections render a `<LockIcon />` and disable the click-through behaviour; the card surface still receives keyboard focus and announces "Locked — complete *{prereq.title}* first" to screen readers.

---

## 10. Validation Summary

| Entity | Rule | Enforced where |
|--------|------|----------------|
| `testimonials.content` | length 50–1 500 chars | DB CHECK + form |
| `testimonials.rating` | 1–5 or null | DB CHECK + form |
| `testimonials.(participant_id, session_id)` | unique | DB UNIQUE |
| `structured-text` | every question ≥ `min_length` | Frontend (right-arrow gate); `is_complete` flag |
| `rating-picker` | every item rated within scale | Frontend (right-arrow gate); `is_complete` flag |
| `table` with `total_target` | `total_spent === total_target` to advance | Frontend on next slide's gate |
| Section lock | prior section's `section_completed_at != null` | Frontend on My Course |
| Slide-group co-location | all exercises in the group must be `is_complete` to advance | Frontend |

No DB-layer ENUM is introduced for new exercise types — only the existing CHECK constraint is extended (see research.md R7).
