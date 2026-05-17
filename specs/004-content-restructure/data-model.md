# Phase 1 — Data Model

**Feature**: 004-content-restructure
**Date**: 2026-05-15
**Plan**: [plan.md](plan.md)
**Research**: [research.md](research.md)

## Entity overview

| Entity | Status | Storage | Notes |
|---|---|---|---|
| `SectionGroup` | **new** logical entity | denormalized as `sections.group_slug` (R1) | Three values: `self-awareness`, `goal-setting`, `strategic-planning`. Display metadata in `src/lib/constants.ts`. |
| `Section` | **modified** | `public.sections` + new column `group_slug` | Slug renames for 3 sections; 3 new sections; 1 section retired. |
| `Exercise` | **modified at row level** | `public.exercises` (schema unchanged) | Wholesale reseeded. `content_json.questions[]` shape extended per R3. |
| `Response` | **rows wiped** | `public.responses` | Wiped by migration 014. Schema unchanged. |
| `Progress` | **rows wiped** | `public.progress` | Wiped by migration 014. Schema unchanged. |
| `Profile`, `Session`, `Enrollment`, `Testimonial` | **unchanged** | — | Untouched by this iteration. |

---

## SectionGroup (logical entity)

Represented as the **enum domain** of `sections.group_slug`. The three values:

| `group_slug` | Display title | `order_index` of group | Description |
|---|---|---|---|
| `self-awareness` | **Self Awareness** | 1 | The five PSP™ Filters that surface who you already are. |
| `goal-setting` | **Goal Setting** | 2 | Naming what you want, weighing trade-offs, and visualising the outcome. |
| `strategic-planning` | **Strategic Planning** | 3 | Removing obstacles and committing to actions. |

**Source of truth**: `src/lib/constants.ts` exports:

```ts
export const GROUP_SLUGS = ['self-awareness', 'goal-setting', 'strategic-planning'] as const
export type GroupSlug = (typeof GROUP_SLUGS)[number]

export const GROUP_META: Record<GroupSlug, { title: string; description: string; order: number }> = {
  'self-awareness':     { title: 'Self Awareness',     description: '…', order: 1 },
  'goal-setting':       { title: 'Goal Setting',       description: '…', order: 2 },
  'strategic-planning': { title: 'Strategic Planning', description: '…', order: 3 },
}
```

`useSectionGroups()` returns `Group[]` where each `Group` is `{ slug, title, description, order, sections: Section[] }` — derived purely from the existing `sections` fetch + `GROUP_META`.

---

## Section (modified)

### Schema delta

```sql
ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS group_slug text;

DO $$ BEGIN
  ALTER TABLE public.sections
    ADD CONSTRAINT sections_group_slug_check
    CHECK (group_slug IS NULL OR group_slug IN ('self-awareness','goal-setting','strategic-planning'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

(`group_slug` stays nullable to preserve the "Unassigned" fallback from the spec's Edge Cases.)

### Row delta (after migration 014)

| `order_index` | `slug` | Title | `group_slug` | Action |
|---|---|---|---|---|
| 1 | `personality` | Personality | `self-awareness` | retained — content untouched |
| 2 | `attitude` | Attitude | `self-awareness` | **renamed** from `attitudes` |
| 3 | `values` | Values | `self-awareness` | retained |
| 4 | `roles-and-demands` | Roles and Demands | `self-awareness` | **renamed** from `roles` |
| 5 | `transferable-skills` | Transferable Marketable Skills | `self-awareness` | **renamed** from `skills` (title gains "Marketable") |
| 6 | `specific-goals` | Specific Goals | `goal-setting` | **new** — takes life-goal-inventory + goal-priorities |
| 7 | `goal-impact-matrix` | Goal Impact Matrix | `goal-setting` | **new** — takes cross-impact-matrix |
| 8 | `visualization` | Visualization | `goal-setting` | **new** — takes the visualization workbook content + new journal exercise |
| 9 | `removing-obstacles-achieving-goals` | Removing Obstacles, Achieving Goals | `strategic-planning` | **new** — takes goal-achievement-plan (reshaped) + success-failure-alibis + declaration-of-self-esteem |

The legacy `goal-setting` and `attitudes`/`roles`/`skills` slugs do not survive the migration. The `copyright-footer` info exercise is removed; its content lives on `/course/complete`.

---

## Exercise (modified at row level only)

### Schema: unchanged

Schema additions from Iter 4 (`slide_group`, the extended type CHECK) are already in place. No further schema changes.

### Row delta

Total exercise count goes from 30 to **≈ 36** (rough estimate; exact count fixed in `contracts/group-section-mapping.md`).

**Breakdown by new section:**

| Section | Exercise slugs (new or reused) | Notes |
|---|---|---|
| personality | 7 exercises, unchanged | content_json bodies unchanged, just re-parented |
| attitude | 4 exercises, unchanged | re-parented to renamed section |
| values | 3 exercises, unchanged | re-parented |
| roles-and-demands | 5 exercises, unchanged in count; `top-three-values`-style audit per R9 may promote some text→structured-text | |
| transferable-skills | 4 exercises, unchanged in count; audit per R9 | |
| specific-goals | 2 exercises: `life-goal-inventory` (table), `goal-priorities` (ranking) | extracted from legacy `goal-setting` |
| goal-impact-matrix | 1 exercise: `cross-impact-matrix` (table) | extracted |
| visualization | 2 exercises: `visualization-practice` (info, **new content**), `visualization-journal` (structured-text, **new**, 4 questions) | per R4 |
| removing-obstacles-achieving-goals | 5 exercises: `goal-introspection` (structured-text, 6 questions, reshaped from legacy `goal-achievement-plan`), `removing-obstacles` (structured-text, ~64 questions, **new**), `achieving-goal-actions` (structured-text, 40 questions, **new**), `success-failure-alibis` (checkbox, re-parented), `declaration-of-self-esteem` (text, re-parented) | per R5/R6 |

### `content_json` shape extensions

For `structured-text` and (when N>1) `text` exercises:

```jsonc
{
  "intro": "Optional preamble shown above the question list.",
  "combined": false,                     // optional; default false
  "combined_rationale": "...",           // required iff combined === true
  "questions": [
    {
      "id": "snake_or_kebab_id",
      "prompt": "Mandatory workbook prompt text",
      "placeholder": "optional hint",
      "required": true,                  // default true
      "max_length": 2000
    }
  ]
}
```

For all other exercise types: shape unchanged from Iter 4.

### Question ID conventions (per section)

- `goal-introspection.questions[].id` → `importance`, `long_term`, `feel_attained`, `feel_not`, `chances`, `if_fail`
- `removing-obstacles.questions[].id` → `goal1_personal_1` … `goal1_personal_4`, `goal1_world_1` … `goal8_world_4` (64 entries total)
- `achieving-goal-actions.questions[].id` → `goal1_action_1` … `goal8_action_5` (40 entries)
- `visualization-journal.questions[].id` → `what_seen`, `who_present`, `place_details`, `one_action`

---

## State diagram — section-lock cascade across 9 sections

The lock cascade from Iter 4 is preserved verbatim; only the section count changes. A section is **unlocked** iff its predecessor (by `order_index`) is **complete**.

```text
[personality:unlocked]
   ↓ complete?
[attitude:locked → unlocked]
   ↓
[values:locked → unlocked]
   ↓
[roles-and-demands:locked → unlocked]
   ↓
[transferable-skills:locked → unlocked]
   ↓  ── Self Awareness complete ──
[specific-goals:locked → unlocked]
   ↓
[goal-impact-matrix:locked → unlocked]
   ↓
[visualization:locked → unlocked]
   ↓  ── Goal Setting complete ──
[removing-obstacles-achieving-goals:locked → unlocked]
   ↓ complete?
/course/complete (closing screen + testimonial CTA)
```

Group transitions (Self Awareness → Goal Setting → Strategic Planning) are derivable from `group_slug` order; no additional locking semantics. The visual indicator on `/course` shows three group bands with their constituent sections' lock state.

---

## CSS / visual treatment (advisory; finalized in quickstart.md)

- `GroupBand` renders a `<section>` element with a `<h2>` group title + a brief description + a `<div role="list">` of `SectionCard`s.
- Group titles use `var(--text-2xl)` weight `semibold`; description uses `var(--text-base)` muted color.
- **Per-group background tint** (mapped to the existing `tokens.css` palette — no new color tokens introduced; audited 2026-05-16: `*-50` variants don't exist in this codebase, so the `-light` variants are used instead):
  - `self-awareness` → `var(--color-trust-light)` (#EBF0FF, soft blue)
  - `goal-setting` → `var(--color-warmth-light)` (#FEF3E5, soft warm/gold)
  - `strategic-planning` → `var(--color-growth-light)` (#E3F5EE, soft green)
  These are existing tokens in `tokens.css` (lines 5, 8, 10). No new color tokens added. If a future palette refresh introduces dedicated `*-50` variants, swap the mappings then.
- Margin between group bands: `var(--space-12)`.

---

## Bundle-size accounting (vs Constitution §IV budget)

| Addition | Estimated gz size |
|---|---|
| `GroupBand.tsx` + `.module.css` | ~1.0 KB |
| `useSectionGroups.ts` | ~0.4 KB |
| `SectionGroupContext.tsx` (US5 affordance) | ~0.6 KB |
| `GROUP_META` constant + types | ~0.2 KB |
| `validate-seed.ts` (devDependency, **not** in browser bundle) | 0 KB browser |
| **Total participant-bundle delta** | **~2.2 KB gz** ≤ 3 KB budget ✓ |
