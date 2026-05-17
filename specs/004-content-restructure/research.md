# Phase 0 — Research

**Feature**: 004-content-restructure
**Date**: 2026-05-15
**Plan**: [plan.md](plan.md)
**Spec**: [spec.md](spec.md)

This document resolves each `NEEDS CLARIFICATION` / open design item flagged in `plan.md`. Each item follows the format **Decision / Rationale / Alternatives considered**.

---

## R1 — Group representation: column on `sections` vs separate `section_groups` table

**Decision**: Add a single nullable text column `group_slug` on `public.sections`. The three group values are a fixed, client-side-mirrored enum (`self-awareness`, `goal-setting`, `strategic-planning`). The display title and description for each group are stored in `src/lib/constants.ts` as a `GROUP_META` object, keyed by slug. No new table.

**Rationale**:
- The group vocabulary is small (3 rows), stable, and **never joined to participant-scoped data** (responses/progress are keyed on `exercise_id`, not `group_slug`).
- A normalized `section_groups` table would force an extra JOIN on every `/course` page load with zero analytic upside; the data is part of the *content schema*, not the *participant schema*.
- Client-side `GROUP_META` (Title + display order + description) is the same shape we already use for `EXERCISE_TYPE` and `SECTION_SLUGS` constants; no new pattern.
- We keep `group_slug` nullable to support gradual rollout and to honor the spec's "Unassigned" fallback (Edge Case in spec.md).

**Alternatives considered**:
- (a) Normalized `section_groups(id, slug, title, order_index)` table with FK from `sections.group_id` → rejected. Three-row tables that never grow are anti-patterns when the only consumer is the UI. The extra JOIN costs more than the schema clarity is worth.
- (b) Hard-code groups in the React layer; store no `group_slug` on `sections` at all → rejected. Couples IA to client; future facilitator/admin tools cannot query "sections in Self Awareness" without the column.
- (c) Use `tags text[]` on `sections` → rejected. Overgeneralized for our actual need; weakens type-safety; complicates ordering.

**Implication**: Migration 014 adds `ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS group_slug text;` plus a deferred `CHECK (group_slug IS NULL OR group_slug IN ('self-awareness','goal-setting','strategic-planning'))`. `src/lib/constants.ts` gains `GROUP_SLUGS` + `GROUP_META`.

---

## R2 — Order-index invariant enforcement

**Decision**: Enforce the invariant *"all Self Awareness sections have lower `order_index` than all Goal Setting sections, which are lower than all Strategic Planning sections"* via **seed-side validation only** (run by `scripts/validate-seed.ts` and by a Vitest unit test). Do **not** add a Postgres CHECK constraint or generated column.

**Rationale**:
- The invariant is **content-policy** rather than a hard correctness constraint. Violating it produces ugly UX, not data corruption. The current 6-section model has no such constraint and has not regressed.
- A CHECK constraint expressing "the max order_index of group_slug=X is < the min order_index of group_slug=Y" is not naturally expressible in a row-level CHECK; it requires a deferred trigger that scans the whole table on every INSERT/UPDATE — overkill for a 9-row table that admins never edit live.
- Seed-side validation catches the issue at the moment it happens (seed regeneration time) with a clear error message. CI gate.

**Alternatives considered**:
- (a) Add a Postgres CHECK on (group_slug, order_index) range — rejected for the reasons above.
- (b) Use a generated `(group_slug, group_sequence)` composite as the canonical order — rejected. Requires touching every consumer that orders by `order_index`. Single-column ordering is fine.
- (c) Trust seed authors; no validation — rejected. The seed is regenerated whole; one careless `order_index` could break the IA silently.

**Implication**: `scripts/validate-seed.ts` will assert ordering monotonicity. CI calls the script. Vitest mirror is provided so local TDD catches the same failure.

---

## R3 — Per-question contract shape for `content_json`

**Decision**: For exercises of type `structured-text` (and `text` when they expose >1 prompt), `content_json.questions` is an array of:

```jsonc
{
  "id": "kebab_or_snake_case_stable_key",   // required, unique within exercise
  "prompt": "Full mandatory workbook prompt text",  // required, non-empty
  "placeholder": "optional hint text",
  "required": true,                          // default true; set false explicitly to mark optional
  "max_length": 2000                         // optional soft limit; renderer warns past it
}
```

When two or more prompts must share a single answer field (rare; only for tightly-interlinked sub-prompts), the **exercise** carries:

```jsonc
{
  "type": "structured-text",
  "content_json": {
    "combined": true,
    "combined_rationale": "One-line explanation citing the workbook construct that makes splitting nonsensical.",
    "questions": [ { "id": "...", "prompt": "..." } ]
  }
}
```

Validation rule (`scripts/validate-seed.ts`):

1. For every `structured-text` exercise where `combined` is absent or false → `questions[]` length must equal the count of mandatory workbook prompts cited for that exercise in `contracts/group-section-mapping.md`. Mismatch is a hard error.
2. For every exercise where `combined: true` → `combined_rationale` must be a non-empty string (≥ 20 chars).
3. Every `questions[].id` is non-empty, kebab/snake case, unique within the exercise.
4. Every `questions[].prompt` is a non-empty string (≥ 5 chars).
5. Required `text` exercises that pose only **one** prompt remain as `type: "text"` (single textarea) — they are not forced into `structured-text`. The per-question rule applies *only when N>1 mandatory prompts exist*.

**Rationale**:
- The structured-text renderer already understands `content_json.questions[]` (Iter 4 ships exercises with up to 14 questions); we extend the contract minimally — adding `prompt` as the canonical source of truth (it was empty-string in legacy data; see R9), and adding `combined` / `combined_rationale` at the *exercise* level.
- The participant's response is already a JSON object keyed by `questions[].id` (Iter 4 convention). Per-question dedup, per-question auto-save status, and per-question word counts all already work.
- A `required: false` opt-out preserves the "optional" carve-out from the user's brief.

**Alternatives considered**:
- (a) Put `combined` on each `questions[]` entry rather than at exercise level — rejected. Combination is a single decision per exercise; per-question scope invites partial-combination confusion.
- (b) Move `prompt` into a separate `i18n` keyfile — rejected. We have no i18n scope; over-engineering.
- (c) Use Zod or another schema-validation lib in `validate-seed.ts` — see R8.

**Implication**: Existing structured-text exercises (audit in R9) will have their `prompt` fields backfilled. `StructuredTextExercise.tsx` already renders one labelled textarea per question; no renderer changes needed if `prompt` is properly populated.

---

## R4 — Visualization section interactive exercise

**Decision**: The `visualization` section ships with **two exercises**:

1. `visualization-practice` (`info`) — the body text from `psp_content.md:1598–1615` rendered as a static info slide, with the 9 bullet-pointed steps preserved verbatim and the closing paragraph about daily practice.
2. `visualization-journal` (`structured-text`) — a 4-question journal exercise asking the participant to record what they saw, who else was present, what the place looked/felt like, and one concrete future-self action they will take from the visualization. Drawn from the introspective prompts already implicit in the workbook body. **All four questions are required** so the section can satisfy completion criteria (per Iter 3's `e.type <> 'info'` rule).

**Rationale**:
- An info-only section cannot be auto-completed by the progress trigger (Iter 3 fix excludes info exercises from `v_total`). Without an interactive exercise, Visualization would be unreachable as a completion gate; the cascade to Strategic Planning would break.
- A short structured-text journal is the lowest-friction way to introduce a completion surface while preserving the meditative-practice intent of the workbook.
- Four questions follows the per-question rule from US3.

**Alternatives considered**:
- (a) Make Visualization a pure reading section with no completion gate; auto-mark complete after a 30-second dwell timer → rejected. Adds a new completion mechanism inconsistent with the rest of the course; also game-able and gameably-skippable.
- (b) A `checkbox` exercise listing the 9 visualization steps for the participant to tick → rejected. Encourages checking-without-doing; doesn't capture the reflective output the workbook intends.
- (c) Embed the journal questions inside the info exercise → rejected; collapses two distinct concerns (reference vs reflection) into one slide and breaks slide-pacing.

**Implication**: New `visualization-journal` exercise authored from scratch; question prompts drafted from psp_content.md:1598–1615; subject to IP review.

---

## R5 — Removing Obstacles & Achieving Goals section shape

**Decision**: The `removing-obstacles-achieving-goals` section ships with **three exercises**, modelled after the workbook's existing three-block structure per goal:

1. `goal-introspection` (`structured-text`) — the 6 mandatory reflection questions from psp_content.md:1623–1632 (importance, long-term, feel-attained, feel-not, chances, if-fail). One question entry per workbook prompt. These are asked **once for all goals in aggregate** (the workbook intends one reflection pass, not eight). The existing `goal-achievement-plan` exercise can be reshaped into this if its current question set covers the 6 prompts (R9 audit).
2. `removing-obstacles` (`structured-text` with section subheadings) — per-goal blocks (goals 1..8), each asking:
   - "Personal shortcomings keeping me from goal N" (4 sub-questions)
   - "External obstacles" (4 sub-questions)
   - Final shape: **single `structured-text` exercise with 64 prompts** (8 goals × 8 sub-questions). The "what I can do about each obstacle" thread is captured by the paired per-goal entries in `achieving-goal-actions` (next exercise), not a separate `table` exercise. See data-model.md §Row delta for the final inventory.
3. `achieving-goal-actions` (`structured-text` with subheadings) — per-goal lists of 5 concrete actions ("Achieving Goal N — what specific things can I do…"). 8 goals × 5 actions = 40 question entries.

This produces a sizeable exercise inventory (1 + 1 + 1 = 3 exercises; question counts: 6 + ~64 + 40 = ~110 question entries total). Renderer impact: the structured-text component already handles arbitrary question counts; pagination/scroll behavior is unchanged.

**Rationale**:
- Splitting per-goal-per-block into 16+ separate exercises would balloon the slide count (16 slides for one section) and break the meditative pacing.
- Three exercises balances the per-question rule (FR-010) with the slide-pacing rule (Iter 4).
- Workbook authoring intent: the introspection happens once (all goals in scope), the obstacles/actions are enumerated per goal. Honors the canonical structure.

**Alternatives considered**:
- (a) One mega `structured-text` with 110 questions — rejected. Becomes one infinitely-scrolling slide; participant cannot save partial progress per goal block.
- (b) 16 exercises (one per goal per block) — rejected. Too many slides; breaks pacing; complicates lock logic.
- (c) A `table` exercise per goal with rows = obstacles, columns = actions — rejected. Conflates structured prose ("personal shortcomings") with tabular thinking; loses the workbook's distinct prompts.

**Implication**: ~110 question entries to author. Subject to IP review. Slug renaming: the existing `goal-achievement-plan` (structured-text, 10 questions) is reshaped into `goal-introspection`; its current `id` keys (`top_goal`, `importance`, etc.) inform the new question IDs.

---

## R6 — Final exercises placement

**Decision**:
- `success-failure-alibis` (checkbox) → moves into **`removing-obstacles-achieving-goals`** as its closing exercise. Pedagogically it belongs at the obstacles-discussion phase, not as a standalone section.
- `declaration-of-self-esteem` (text) → moves into **`removing-obstacles-achieving-goals`** as the final exercise. It's the workshop's closing affirmation; placing it at the very end of the final section preserves the workbook's rhetorical climax.
- `copyright-footer` (info) → **removed as a section exercise**. The same content is rendered by `CourseClosing.tsx` (Iter 4) on `/course/complete`. Avoids redundancy.

Final exercise order inside `removing-obstacles-achieving-goals`:

1. `goal-introspection` (structured-text, 6 questions)
2. `removing-obstacles` (structured-text, per-goal, ~64 questions)
3. `achieving-goal-actions` (structured-text, per-goal, 40 questions)
4. `success-failure-alibis` (checkbox, the IF list)
5. `declaration-of-self-esteem` (text, single textarea)

The closing slide for this section is the testimonial CTA (Iter 4 contract).

**Rationale**: Keeps the workshop's narrative arc intact (goal reflection → obstacle planning → action commitment → guarding against alibis → declaration). The `/course/complete` page handles attribution and "thank you" copy.

**Alternatives considered**:
- (a) Promote `success-failure-alibis` + `declaration-of-self-esteem` into a fourth Strategic Planning section ("Self-Esteem & Close") → rejected; spec.md mandates one Strategic Planning section only. User would need to explicitly add a fourth.
- (b) Keep `copyright-footer` as a section exercise → rejected; duplicated content.

**Implication**: Section count stays at 9 (matching FR-002). The final section gets 5 exercises.

---

## R7 — Migration idempotency strategy

**Decision**: Migration 014 follows a three-phase pattern executed within a single transaction:

```sql
BEGIN;

-- Phase A: Schema additions (idempotent via IF NOT EXISTS)
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS group_slug text;
ALTER TABLE public.sections
  ADD CONSTRAINT IF NOT EXISTS sections_group_slug_check
  CHECK (group_slug IS NULL OR group_slug IN ('self-awareness','goal-setting','strategic-planning'));

-- Phase B: Data wipe (responses + progress only)
DELETE FROM public.responses;
DELETE FROM public.progress;

-- Phase C: Reseed sections + exercises
DELETE FROM public.exercises;
DELETE FROM public.sections;
INSERT INTO public.sections (slug, title, subtitle, description, order_index, group_slug, icon_name) VALUES
  (...),  -- 9 rows in canonical order
  ;
INSERT INTO public.exercises (section_id, slug, title, type, content_json, order_index, ...) VALUES
  (...),  -- ~45 rows
  ;

COMMIT;
```

Idempotency comes from:
- `ADD COLUMN IF NOT EXISTS` + `ADD CONSTRAINT IF NOT EXISTS` — Postgres 15+ supports the latter; falls back to a DO-block `DROP CONSTRAINT IF EXISTS; ADD CONSTRAINT;` for portability.
- Phase B is naturally idempotent (DELETE FROM empty table is a no-op).
- Phase C re-deletes-then-inserts; running twice in succession is identical to running once. The `INSERT … SELECT FROM (VALUES …)` pattern guarantees the same content + ordering.

**Rationale**:
- The wholesale-delete-and-reinsert pattern is acceptable here because (a) responses + progress are already empty post-Phase B, so no FK violations; (b) all `sections` and `exercises` IDs are auto-generated, so consumers reference them only via slug.
- Trying to use `ON CONFLICT (slug) DO UPDATE` for sections/exercises is fragile when slugs are renamed (`attitudes` → `attitude`): the old row would persist alongside the new row. Wipe-and-reinsert avoids that.

**Alternatives considered**:
- (a) Slug-mapping table inside the migration that translates old slugs to new — rejected. Over-engineering for a 6-row vocabulary. Wipe-and-reinsert is clearer.
- (b) Tag the new structure with a `content_version` column and route based on that — rejected; introduces a versioning concept we don't need.
- (c) Do the wipe in three separate migrations (014a/b/c) — rejected; the three phases are conceptually one atomic restructure.

**Implication**: Migration 014 is a single transactional `.sql` file with all three phases. The down migration restores legacy sections+exercises from a snapshot (best-effort; this is not a reversible op for production purposes — see Complexity Tracking).

---

## R8 — Seed-validation tooling

**Decision**: Write `scripts/validate-seed.ts` as a **bare TypeScript script** (no new deps). It uses Node's built-in `fs/promises` + `JSON.parse`, defines a small `Assert(condition, message)` helper, walks the JSON structure, and emits a one-violation-per-line report on stderr with exit code 1 if anything fails. Mirror as `scripts/validate-seed.test.ts` (Vitest) for local TDD.

**Rationale**:
- The contract from R3 is small (≤ 6 invariants). A handwritten validator is ~150 lines; a Zod-based one is ~80 lines + a Zod dep.
- Constitution §IV bundle hygiene argues against new runtime deps. A devDependency is less harmful but still adds to install time and supply-chain surface area.
- We already have the `scripts/rpc.test.ts` precedent of dep-free TypeScript node scripts.

**Alternatives considered**:
- (a) Zod — most idiomatic, slightly cleaner code, but adds a runtime+types dep. Rejected on §IV.
- (b) Ajv + JSON Schema — verbose, ergonomics worse than Zod, two extra deps. Rejected.
- (c) Generate types from the schema for runtime parity — overkill for this contract size. Rejected.

**Implication**: One new file `scripts/validate-seed.ts`. Add a `package.json` script `"validate:seed": "tsx scripts/validate-seed.ts db/seeds/course-content.json"`. CI runs it on every PR touching `db/seeds/**` or `scripts/**`.

---

## R9 — Existing structured-text content drift audit

**Decision**: The current seed has **empty `prompt` strings** on every existing structured-text question (audit confirmed 2026-05-15; see `cat db/seeds/course-content.json | python3 -c ...` output captured in this iteration's planning notes). The prompts must be rendered from somewhere else today — likely a labels array elsewhere in `content_json`, or the renderer derives them from `id`. **All four legacy structured-text exercises must be re-authored** to populate `prompt` per the R3 contract.

Legacy exercises requiring re-authoring:

| Slug | Current question count | Workbook prompt count | New question count | Notes |
|---|---|---|---|---|
| `past-experience-inventory` | 14 | (re-audit against psp_content.md:1058–1144) | TBD | Some `q*` ids may need rename to semantic ids. |
| `contract-with-myself` | 6 | 6 (six articles) | 6 | `article_*` ids are already semantic; just fill `prompt`. |
| `mission-statement` | 5 | 5 (vision/self/others/world/one-sentence) | 5 | ids already semantic; fill `prompt`. |
| `goal-achievement-plan` | 10 | 6 mandatory introspection + 2 obstacle blocks + 1 actions block | Reshape into `goal-introspection` (6) per R5/R6. The 4 trailing `personal_obs`/`world_obs`/`action_steps` will be remodeled into `removing-obstacles` and `achieving-goal-actions`. |

Additionally, **plain `text` exercises** with multiple workbook prompts need to be re-evaluated under FR-010:

| Slug | Current type | Workbook prompts | Action |
|---|---|---|---|
| `my-core-style` | text | 1 free-form ("My core style is...") | Keep as `text`. |
| `attitude-power-points` | text | (re-audit psp_content.md:810–832) — likely a multi-prompt reflection | Promote to `structured-text` if N>1. |
| `top-three-values` | text | 3 ranked values | Promote to `structured-text` (3 questions). |
| `life-line-exercise` | text | 1 drawing-prompt (ASCII canvas in workbook) | Keep as `text` for now; drawing capture is out-of-scope for this iter. |
| `favorite-strongest-skills` | text | (re-audit psp_content.md:1341–1370) — likely a multi-part list | Promote to `structured-text` if N>1. |
| `declaration-of-self-esteem` | text | 1 free-form affirmation | Keep as `text`. |

**Rationale**: The audit cannot be fully decided in research; it must happen during seed authoring (WS-2). Listing the candidates here so tasks.md scopes the audit work explicitly.

**Alternatives considered**: N/A — the audit is the work.

**Implication**: WS-2 includes a "Workbook prompt audit" task per legacy exercise. The seed-validator from R8 enforces the rule once authoring is done.

---

## R10 — Slug renaming and link-rot

**Decision**: All references to legacy section slugs in `src/lib/constants.ts:23–30` must be updated to the new slugs. Audit results (2026-05-15):

| Reference | File / Location | Action |
|---|---|---|
| `SECTION_SLUGS` array | `src/lib/constants.ts:23–30` | Replace with the new 9-slug array in workbook order. |
| `nextSectionSlug` helper | `src/lib/sectionNavigation.ts` (or wherever Iter 4's slug-walker lives) | Verify it reads from `SECTION_SLUGS`; no other change needed. |
| Test fixtures using `'attitudes' / 'roles' / 'skills' / 'goal-setting'` | `src/**/*.test.{ts,tsx}` | Update fixture strings; test names that reference old slugs renamed. |
| `psp_content.md` | section headings | Light edit: `# ATTITUDES` → `# ATTITUDE`, `# TRANSFERABLE SKILLS` → `# TRANSFERABLE MARKETABLE SKILLS` to match user-spec exactly. Optional — only do if it doesn't disturb verbatim attribution lines. |
| External deep-link URLs | none expected — confirm with user | If any exist, add a server-side 301 redirect from `/course/attitudes` → `/course/attitude` etc. Likely not needed (pre-prod). |

**Rationale**: Sluggrep audit returned **only** `src/lib/constants.ts:25,27,28,29` as production references (test files excluded). No `ROUTES.*` constants use the slugs; no email templates exist. Refactor is mechanical.

**Alternatives considered**:
- (a) Keep old slugs, only change titles — rejected. The slugs are user-visible (in the URL); the user-spec uses singular "Attitude" and "Roles and Demands". Honor the spec.
- (b) Add HTTP redirects for the old slugs — premature optimization; defer until/unless we hear about a broken external link.

**Implication**: Update `src/lib/constants.ts`, sweep tests for hardcoded slug strings, optionally edit `psp_content.md` headings (preserve attribution lines verbatim per Constitution §IP).

---

## Open items rolling forward to Phase 1

All Phase 0 open items have since been resolved by Phase 1 artifacts:

- ~~Workbook line ranges per new section~~ — resolved in `contracts/group-section-mapping.md`.
- ~~`combined_rationale` wording~~ — resolved: zero `combined: true` exercises after the R9 audit (`contracts/group-section-mapping.md` §Question-prompt count rule).
- ~~~110-question ID convention~~ — resolved in `data-model.md` §Question ID conventions (`goalN_personal_M`, `goalN_world_M`, `goalN_action_M`).
- ~~GroupBand visual treatment~~ — resolved in `data-model.md` §CSS / visual treatment (per-group token mapping: self-awareness → `--color-trust-50`, goal-setting → `--color-gold-50`, strategic-planning → `--color-clarity-50`).

R1–R10 are **decided**. Phase 2 (`/speckit-tasks`) consumes this research as-is.
