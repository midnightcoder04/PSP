# Implementation Plan: Course Content Restructure — Three Groups, Nine Sections, Per-Question Answer Fields

**Branch**: `004-content-restructure` | **Date**: 2026-05-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-content-restructure/spec.md`

## Summary

Reshape the PSP™ course from its flat 6-section layout into the workbook's published three-phase structure: **Self Awareness** (5 sections) → **Goal Setting** (3 sections) → **Strategic Planning** (1 section). Three things change in lockstep:

1. **Information architecture (IA)** — `/course` renders three group bands; sections live under groups; lock-cascade extends to nine sections.
2. **Content & seeds** — the existing `goal-setting` section splits into `specific-goals` / `goal-impact-matrix` / `visualization`; a new `removing-obstacles-achieving-goals` section is added; three existing sections are renamed (`attitudes` → `attitude`, `roles` → `roles-and-demands`, `skills` → `transferable-skills`); `psp_content.md` becomes the canonical source from which `db/seeds/course-content.json` is regenerated.
3. **Per-question answer fields** — every `structured-text` and `text` exercise exposes one input per mandatory workbook prompt; the few exceptions carry an explicit `combined: true` + `combined_rationale` justification.

Architecturally this is **additive on schema, destructive on rows**: one new column on `sections` (`group_slug`), wholesale rewrite of `sections` + `exercises` rows, and a wipe of `responses` + `progress` (US4, pre-production-safe per user confirmation 2026-05-15). No new dependencies. No new exercise types. No changes to Iteration 4's slide-nav, section-locking, or testimonials.

The plan is broken into **four workstreams** that can be partially parallelised after Phase 1 design is complete:

| WS | Scope | Owner concern |
|----|-------|---------------|
| WS-1 | Schema migration (014) + group metadata + section reseed | Database |
| WS-2 | Seed JSON regeneration (psp_content.md → course-content.json) + per-question authoring | Content authoring |
| WS-3 | CourseHome grouping UI + group-band component | Participant UI |
| WS-4 | SectionPage group-context affordance + tests across new section count | Participant UI |

WS-1 and WS-2 must converge before WS-3 / WS-4 can be exercised end-to-end; within each workstream Test-First (Constitution §II) is non-negotiable.

---

## Technical Context

**Language/Version**: TypeScript 5.5 + React 18.3 + Vite 5.4 *(unchanged from Iter 1–4)*
**Primary Dependencies**:
  - existing: `@supabase/supabase-js` v2.105, `react-router-dom` v6.26, `@dnd-kit/core` + `@dnd-kit/sortable` (added in Iter 4), `recharts` v2.12
  - **new**: *none*. This iteration is content + IA only.
**Storage**: Supabase Postgres 17.6 — additions: 1 nullable column on `sections` (`group_slug text`). Row-level rewrites on `sections` and `exercises`. Wipe of `responses` and `progress`.
**Testing**: Vitest + `@testing-library/react` for UI; SQL test files under `db/tests/` (the `014_*.sql` test pair will follow the RED/GREEN-in-header convention established by 013 in Iter 3); JSON-schema validation for the per-question authoring contract via a small Node script under `scripts/`.
**Target Platform**: Web — Chrome 110+, Firefox 115+, Safari 16+. No mobile-app target.
**Project Type**: Single-page web application *(unchanged)*.
**Performance Goals**: p95 page load ≤ 2 000 ms (4G); TTI ≤ 3 500 ms; Supabase RPC p99 ≤ 500 ms *(constitution baselines, unchanged)*. **Feature-specific**: `/course` Lighthouse FCP ≤ 1 500 ms on a 4G profile with 9 sections and 3 group bands (current 6-section baseline ~1 200 ms; SC-PERF-4). SC-PERF-1 (p95 page load ≤ 2 000 ms) and SC-PERF-2 (TTI ≤ 3 500 ms) are captured in the same Lighthouse pass (tasks.md T058). SC-PERF-3 (API read p99 ≤ 500 ms) is **out of scope** for this iteration: no new RPCs or read endpoints are introduced; the existing sections query gains one column. SC-PERF-3 inherits its prior verification baseline from Iteration 3's RPC test suite.
**Constraints**:
  - Bundle size delta ≤ 3 KB gzipped (no new deps; only the `GroupBand` component and CSS additions).
  - Migration MUST be idempotent and complete in < 5 seconds against the live DB.
  - All new exercises MUST use the existing exercise types (`info`, `text`, `table`, `ranking`, `checkbox`, `structured-text`, `rating-picker`). No new types.
  - Section `order_index` MUST remain globally unique and consistent with group ordering (enforced via seed validation, optionally via a schema CHECK constraint).
  - Wholesale rewrite of seed data MUST preserve every PSP™ attribution, copyright, and "adapted with permission" line verbatim.
**Scale/Scope**: < 500 total users (unchanged); 9 sections × ~5 exercises avg ≈ 45 exercise rows post-migration; one new schema column.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Code Quality**: No new dependencies. New `GroupBand` (or equivalent) component reuses `tokens.css` and the existing card grid. The schema addition is one nullable column with a clear COMMENT. The seed-validation script lives under `scripts/` alongside the existing `scripts/rpc.test.ts` pattern. No `any` types in new code.
- [x] **Test-First**: Each workstream has `[RED]` test tasks preceding implementation (formalized in tasks.md by `/speckit-tasks`). DB migration ships with `db/tests/014_*.sql` files carrying RED+GREEN proof headers (mirrors the 013 convention). Seed-validation has a CLI unit-test pass. CourseHome grouping has a Vitest test asserting three group bands render with correct section counts. SectionPage group-context affordance has a Vitest test asserting the indicator text for representative sections.
- [x] **UX Consistency**: All new visual elements (group band header, group-context affordance in section header) use the existing token system (`--color-trust`, `--space-*`, `--text-*`). No new shared component is introduced without sign-off; `GroupBand` is a section-grouping wrapper, not a new primitive. Section card styling, lock icon, intro/closing slides, slide-nav arrows — all unchanged.
- [x] **Performance**: Net bundle delta ≤ 3 KB gz (single new component + ~30 lines of CSS). DB reads from `/course` increase by 1 column on the existing `sections` query — negligible. No new network round-trips. SC-PERF-4 sets a feature-specific 1 500 ms render budget for `/course` with 9 sections; verified by manual measurement and a Lighthouse spot-check in quickstart.md.
- [x] **IP Compliance**: This feature **directly modifies PSP™ content structure** (sections rename, content split, new sections seeded from `psp_content.md`). Per Constitution §Content & IP Compliance and §IV, an IP review task is **mandatory** before the seed migration commits. The task is listed as a P1 gating task in tasks.md (`T-IP4-001`); the existing `db/seeds/ip-review.md` document is updated as part of that task. All attribution, copyright, and "adapted with permission" lines from the legacy seed and from `psp_content.md` are carried verbatim into the new seed (FR-020).

---

## Project Structure

### Documentation (this feature)

```text
specs/004-content-restructure/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions for each workstream
├── data-model.md        # Phase 1 — group/section/exercise entity changes
├── quickstart.md        # Phase 1 — dev setup + manual verification recipes
├── contracts/
│   ├── seed-json.md             # Per-question contract for content_json
│   ├── group-section-mapping.md # Authoritative IA mapping (groups → sections → exercises)
│   └── migration-014.md         # DDL + reseed contract
└── tasks.md             # Phase 2 — generated by /speckit-tasks (NOT created here)
```

### Source Code (repository root)

```text
db/
├── migrations/
│   └── 014_content_restructure.sql      # NEW — add group_slug, wipe+reseed sections+exercises, wipe responses+progress
├── tests/
│   ├── 014_section_group_invariants.sql # NEW — RED: pre-migration shape; GREEN: 9 sections, 3 groups, monotone order_index
│   └── 014_idempotency.sql              # NEW — applying twice is a no-op
├── seeds/
│   ├── course-content.json              # MOD — regenerated end-to-end from psp_content.md
│   └── ip-review.md                     # MOD — appended Iter 5 review block
└── (no changes to existing 001–013 migrations)

supabase/migrations/
└── 20260516000000_014_content_restructure.sql  # NEW — mirror

scripts/
└── validate-seed.ts                     # NEW — lints course-content.json per-question contract; runs in CI + as a precommit hook target

src/
├── components/
│   └── section/
│       ├── GroupBand.tsx                # NEW — renders a group title + slot for its section cards
│       ├── GroupBand.module.css         # NEW
│       └── SectionGroupContext.tsx      # NEW (optional) — small component for the section-page affordance
├── pages/
│   └── course/
│       ├── CourseHome.tsx               # MOD — groups derived from `sections.group_slug`; renders one GroupBand per group
│       ├── CourseHome.test.tsx          # MOD — assertions for 3 bands × correct section count + ordering
│       ├── SectionPage.tsx              # MOD — render group-context affordance (US5)
│       └── SectionPage.test.tsx         # MOD — affordance test
├── hooks/
│   └── useSectionGroups.ts              # NEW — derives Group[] from the existing sections fetch (no new RPC)
├── lib/
│   └── constants.ts                     # MOD — GROUP_SLUGS + GROUP_TITLES + group order array
├── types/
│   └── database.ts                      # MOD — Section.group_slug field; SectionGroup type
└── (no changes to exercise renderers, slide nav, lock UI, or testimonials)

psp_content.md                            # MOD (light) — section heading nits if any drift is found during the regeneration audit; otherwise unchanged
```

**Structure Decision**: Single-project SPA layout (Option 1) — established in Iteration 1 — extended additively. One new component folder pattern (`section/GroupBand`) follows the existing `section/SlideNav`, `section/SectionIntroSlide` precedent from Iter 4. Seed regeneration script lives under the existing `scripts/` directory next to `rpc.test.ts`.

---

## Phase 0 — Research

The following items will be resolved in [research.md](research.md). Listed here for traceability:

- **R1 — Group representation: column on `sections` vs separate `section_groups` table.** Decision recorded with rationale (denormalized column wins for 3-row vocabularies that never join other tables).
- **R2 — Order-index invariant enforcement.** Decision between schema CHECK constraint, generated column, or seed-side validation only.
- **R3 — Per-question contract shape.** Final JSON shape for `content_json` on `structured-text` / `text` exercises; `combined` / `combined_rationale` semantics; pre-existing `structured-text` exercise content shape compatibility.
- **R4 — Visualization section interactive exercise.** What does the participant *do* in this section beyond reading? Options: a structured-text journal exercise, a checklist of the 9 visualization steps, or a hybrid.
- **R5 — Removing Obstacles & Achieving Goals section shape.** One mega structured-text? One structured-text per goal × 8 goals? Or a `table` exercise with two columns per goal? Decided in research.
- **R6 — Final exercises placement.** Where do `success-failure-alibis`, `declaration-of-self-esteem`, and `copyright-footer` (and the closing testimonial CTA) live in the new IA? (Most likely: success-failure-alibis + declaration-of-self-esteem inside `removing-obstacles-achieving-goals`; copyright-footer becomes part of `/course/complete` rather than a section exercise.)
- **R7 — Migration idempotency strategy.** Use `INSERT … ON CONFLICT (slug) DO UPDATE` for sections + exercises, plus a deterministic `DELETE` for orphan slugs (any row whose slug is not in the new vocabulary).
- **R8 — Seed-validation tooling.** Bare TypeScript script (zero new deps) vs adopting a schema-validation library. Decided in research; default is "bare script" to honor Constitution §IV bundle hygiene.
- **R9 — Existing `structured-text` content drift.** Audit the existing Iter 4 structured-text exercises (`past-experience-inventory`, `contract-with-myself`, `mission-statement`, `goal-achievement-plan`) against `psp_content.md` and confirm whether any need per-question split today.
- **R10 — Slug renaming and link-rot.** `attitudes` → `attitude`, `roles` → `roles-and-demands`, `skills` → `transferable-skills`. Are any of these slugs referenced from `ROUTES.*` constants, deep-link emails, or external links? Audit before commit.

---

## Phase 1 — Design Artifacts

- **[data-model.md](data-model.md)** — entities & shapes:
  - `SectionGroup` (logical entity, denormalized as `sections.group_slug` per R1) — slug, title, description?, order
  - `Section.group_slug` (new column) + the authoritative group↔section mapping
  - `Exercise` content shapes for new/edited exercises (Visualization journaling, Removing Obstacles per-goal, plus any re-shaped structured-text bodies)
  - State diagram for the section-lock cascade across nine sections + three groups
- **[contracts/seed-json.md](contracts/seed-json.md)** — JSON contract enforced by `scripts/validate-seed.ts`:
  - Section row fields, including `group_slug` and `order_index` invariants
  - Exercise row fields per `type`
  - `content_json.questions[]` shape with `id`, `prompt`, optional `placeholder`, optional `combined: true` + `combined_rationale`
- **[contracts/group-section-mapping.md](contracts/group-section-mapping.md)** — authoritative table mapping the three groups → nine sections → each section's exercise inventory (with workbook citation per exercise)
- **[contracts/migration-014.md](contracts/migration-014.md)** — DDL, INSERT/UPDATE/DELETE plan, idempotency proof, and the data-wipe scope (responses + progress only)
- **[quickstart.md](quickstart.md)** — dev setup, how to regenerate the seed locally, how to apply 014 to a scratch branch, how to verify each US's acceptance scenarios manually

---

## Constitution Check (post-Phase-1 re-evaluation)

Re-run after the design artifacts are in hand:

- [x] **Code Quality** — `contracts/seed-json.md` specifies the validator as a bare TypeScript script (zero new deps). `data-model.md` enumerates one new component (`GroupBand`), one new hook (`useSectionGroups`), one new constant block (`GROUP_META`). All within existing patterns; no `any` types planned.
- [x] **Test-First** — each contract pairs implementation with a test target: `db/tests/014_*.sql` (RED/GREEN headers), `scripts/validate-seed.test.ts` (Vitest mirror), `CourseHome.test.tsx` (group-band assertions), `SectionPage.test.tsx` (group-context affordance). `/speckit-tasks` will sequence test→impl per WS.
- [x] **UX Consistency** — `data-model.md §CSS / visual treatment` constrains `GroupBand` to existing `tokens.css` variables (`--text-2xl`, `--space-12`, etc.) and avoids introducing new color tokens. Group-context affordance microcopy specced in `quickstart.md §US5`.
- [x] **Performance** — `data-model.md §Bundle-size accounting` totals ~2.2 KB gz against the 3 KB budget. `/course` DOM-node delta is bounded (3 group headers + 3 wrapper sections — ~12 extra elements). SC-PERF-4 verification recipe lives in `quickstart.md §4`.
- [x] **IP Compliance** — `contracts/group-section-mapping.md` cites every workbook source line per exercise; "IP review checkpoints" section enumerates the mandatory `T-IP4-001` review surface. All attribution lines from the legacy seed are explicitly preserved (FR-020 + I7 in `contracts/seed-json.md`).

No new Constitution violations introduced by Phase 1 design.

---

## Phase status

| Phase | Artifact | Status |
|---|---|---|
| 0 — Research | `research.md` | ✅ R1–R10 resolved |
| 1 — Design | `data-model.md` | ✅ entities + state diagram + bundle accounting |
| 1 — Design | `contracts/seed-json.md` | ✅ JSON shape + I1–I8 invariants |
| 1 — Design | `contracts/group-section-mapping.md` | ✅ authoritative IA + workbook citations |
| 1 — Design | `contracts/migration-014.md` | ✅ DDL + idempotency proof + test outline |
| 1 — Design | `quickstart.md` | ✅ dev recipes + per-US verification |
| 1 — Gate | Constitution Check (post-Phase-1) | ✅ all five principles ticked |
| Agent context | `CLAUDE.md` SPECKIT markers | ✅ updated to point at this plan |

**Next**: run `/speckit-tasks` to produce `tasks.md` for Phase 2 implementation. The four workstreams (WS-1…WS-4) are independent enough to parallelise after WS-1+WS-2 converge; the task generator should reflect that.

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| **Wholesale wipe of `responses` and `progress` during migration 014** (destructive DB action) | Slug renames (`attitudes`→`attitude`, `roles`→`roles-and-demands`, `skills`→`transferable-skills`) and the dissolution of `goal-setting` into four new sections mean a slug-by-slug remap is non-deterministic at the response level (e.g., a response keyed to a removed exercise has no home). Wiping rows is cleaner than dragging dangling FKs through the new schema. | (a) Slug-mapping table + best-effort remap → fragile; produces silent data loss for the removed `goal-setting` exercises and a deceptive sense of preserved continuity. (b) Soft-delete (mark all existing rows `archived=true`) → adds a column nobody else uses just to keep dead rows around. (c) Don't migrate; ship new structure as v2 alongside v1 → doubles surface area for a pre-prod course with zero real-user data behind it. All rejected. User confirmed pre-production status and approved the wipe (Assumption A-1, confirmed via AskUserQuestion 2026-05-15). |

No other Constitution violations identified.

---

## References

- **Spec**: [spec.md](spec.md)
- **Iteration 1 plan** (canonical platform tech stack): `specs/001-psp-course-platform/plan.md`
- **Iteration 3 RPC test plan**: `specs/002-iter2-fixes/plan.md`
- **Iteration 4 slide-nav plan**: `specs/003-slide-nav-ux-rework/plan.md`
- **Iteration 4 progress-fix sub-plan** (sets the migration-test convention this iter inherits): `specs/003-slide-nav-ux-rework/plan-progress-fix.md`
- **Constitution v1.0.0**: `.specify/memory/constitution.md`
- **Canonical content**: `psp_content.md`
