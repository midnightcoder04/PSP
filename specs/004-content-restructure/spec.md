# Feature Specification: Course Content Restructure — Three Groups, Nine Sections, Per-Question Answer Fields

**Feature Branch**: `004-content-restructure`
**Created**: 2026-05-15
**Status**: Draft
**Input**: User description (excerpt):
> "I want to plan Phase 004 with edits to the content structure. The content is available inside in psp_content.md if any new section content is required. I want to restructure the course into the following sections. Self Awareness · Personality · Attitude · Values · Roles and Demands · Transferable Marketable Skills | Goal Setting · Specific Goals · Goal Impact Matrix · Visualization | Strategic Planning · Removing Obstacles, Achieving Goals. Ensure that for new and existing content, if there are multiple defined questions that aren't optional, include separate answer spaces for each question, do not group them into a single set of questions and single answer field unless there are only a few non marked interlinked questions that make logical sense to be together."

---

## Background

Iterations 1–3 shipped a six-section course (Personality, Attitudes, Values, Roles & Their Demands, Transferable Skills, Setting Goals). Iteration 4 (`003-slide-nav-ux-rework`) wrapped that course in a slide-paced, lock-cascaded UX and introduced two new exercise types (`structured-text`, `rating-picker`). Iteration 5 — this feature — **reshapes the course's information architecture** to mirror the published PSP™ workbook's pedagogical groupings and to enforce per-question answer fields wherever the workbook poses distinct, non-optional prompts.

The work is **content + IA**, not a re-platform. Tech stack is unchanged. The schema picks up one small structural addition (group-level metadata for sections) and the seed data is rewritten end-to-end.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Participant sees the workbook's pedagogical map on the course home (Priority: P1)

A returning or first-time participant lands on `/course` and immediately understands the journey: three labelled phases (Self Awareness → Goal Setting → Strategic Planning) with the sections grouped underneath each phase header. The flow reflects the printed PSP™ workbook's structure so facilitators can reference page-equivalents during sessions.

**Why this priority**: This is the core ask. Without it, the course remains a flat 6-card list that fails to communicate the strategic narrative of the workshop.

**Independent Test**: Navigate to `/course` as any authenticated participant. Verify three distinct group headers render in this order: *Self Awareness*, *Goal Setting*, *Strategic Planning*. Verify the section cards appear under their correct group header. Verify section locking still cascades correctly across the new section count.

**Acceptance Scenarios**:

1. **Given** a participant who has not started the course, **When** they visit `/course`, **Then** they see three group bands in order — Self Awareness (5 sections), Goal Setting (3 sections), Strategic Planning (1 section) — with only the first section in the first group unlocked.
2. **Given** a participant who has completed all five Self Awareness sections, **When** they visit `/course`, **Then** the first Goal Setting section (Specific Goals) is unlocked and presented as the "Continue" target.
3. **Given** a participant viewing `/course` on a 375px-wide viewport, **When** they scroll the page, **Then** each group band reads as a coherent unit (group title above its section cards; no cross-group bleed).

---

### User Story 2 — Goal Setting & Strategic Planning content matches the workbook (Priority: P1)

The existing flat "Setting Goals" section is split along the workbook's natural fault lines: *Specific Goals* (the Life Goal Inventory + Top-10 ranking), *Goal Impact Matrix* (the cross-impact matrix), *Visualization* (the visualization practice from psp_content.md:1598), and *Removing Obstacles, Achieving Goals* (the per-goal achievement plan). A participant working through Goal Setting can finish *Specific Goals* in one sitting and return for *Goal Impact Matrix* later without losing context.

**Why this priority**: Without this split, the new IA from US1 has nothing meaningful behind it — three Goal Setting sub-sections would all point at a single legacy section. P1 because US1 cannot ship without it.

**Independent Test**: From the new Goal Setting group, open each of *Specific Goals*, *Goal Impact Matrix*, and *Visualization* in turn. Each opens its own SectionPage with section-appropriate exercises. From Strategic Planning, open *Removing Obstacles, Achieving Goals*. Verify the goal-achievement workbook content appears.

**Acceptance Scenarios**:

1. **Given** the seed data is loaded, **When** an admin queries `SELECT slug FROM sections ORDER BY order_index`, **Then** the result is exactly: `personality`, `attitude`, `values`, `roles-and-demands`, `transferable-skills`, `specific-goals`, `goal-impact-matrix`, `visualization`, `removing-obstacles-achieving-goals` (nine rows, in order).
2. **Given** a participant on `/course/specific-goals`, **When** they complete the Life Goal Inventory and Top-10 ranking, **Then** the section is marked complete and *Goal Impact Matrix* unlocks.
3. **Given** a participant on `/course/visualization`, **When** they read the visualization reference text and complete the visualization journal exercise, **Then** the section is marked complete and *Removing Obstacles, Achieving Goals* unlocks (cross-group transition).
4. **Given** a participant on `/course/removing-obstacles-achieving-goals`, **When** they fill in the 6 reflection questions + per-obstacle plan + per-goal action list for each of their top goals, **Then** the section completes and a "Course complete" closing screen is shown.

---

### User Story 3 — Every non-optional question has its own answer field (Priority: P1)

Every exercise in the rewritten course that poses N>1 distinct, non-optional questions stores N separate response sub-fields and renders N separate input affordances. Only tightly-coupled groups of "interlinked" prompts (small, mutually-dependent, none individually meaningful) may share a single answer surface, and only with an explicit `combined: true` flag in the seed data justified inline.

**Why this priority**: This is half of the user's brief. Without it, the content rewrite from US2 would carry forward the existing legacy practice of cramming multiple workbook questions into one textarea, which (a) makes participant data un-analyzable and (b) erodes the workbook's pedagogy by collapsing distinct prompts into a single conversation.

**Independent Test**: Audit every `structured-text` and `text` exercise in the new seed JSON. For each, verify that the count of `questions[]` entries in `content_json` matches the count of distinct **mandatory** prompts in the corresponding `psp_content.md` workbook section. Any exception MUST carry a `combined_rationale` string explaining the interlink.

**Acceptance Scenarios**:

1. **Given** the Goal Achievement Plan workbook content (psp_content.md:1623–1639, six numbered reflection questions per goal), **When** the seed JSON is rendered, **Then** the exercise exposes exactly six separately-keyed `questions[]` entries for the introspection block (plus the obstacles and actions blocks rendered as their own sub-exercises or sub-questions).
2. **Given** a Mission Statement exercise that asks three distinct workbook prompts, **When** a participant opens it, **Then** they see three labelled textareas (not one merged textarea), each with its own auto-save status indicator.
3. **Given** an exercise marked `combined: true` (e.g., two short interlinked sub-prompts), **When** the IP review reads the seed JSON, **Then** a `combined_rationale` field is present and explains why the interlink is preserved.

---

### User Story 4 — Existing participant data is reset cleanly during the migration (Priority: P2)

The platform is pre-production: no facilitator-led cohort depends on saved progress. The content restructure removes/renames sections and exercises wholesale, so preserving partial progress would produce dangling rows and confusing UI. The migration drops all `responses` and `progress` rows and lets participants restart in the new structure. Profiles, sessions, enrollments, and testimonials are preserved.

**Why this priority**: Necessary to ship cleanly, but lower than the IA/content work because no production data is at stake.

**Independent Test**: Apply the migration in a scratch Supabase branch with seeded fake responses. Verify `SELECT COUNT(*) FROM responses` and `SELECT COUNT(*) FROM progress` both return 0 post-migration. Verify `profiles`, `sessions`, `enrollments`, `testimonials` row counts are unchanged.

**Acceptance Scenarios**:

1. **Given** a Supabase scratch branch with N>0 `responses` rows pointing at legacy exercise slugs, **When** migration 014 is applied, **Then** `responses` and `progress` are empty, and all other tables retain their row counts.
2. **Given** an authenticated participant who had completed Personality on the old structure, **When** they visit `/course` after the migration, **Then** they see all 9 sections as not-yet-started, Personality unlocked, the rest locked in cascade.

---

### User Story 5 — Group-level navigation affordance in the section page (Priority: P3)

When a participant is inside a section page (e.g., `/course/values`), a small group-context indicator shows them which phase of the workbook they're in (e.g., "Self Awareness · Section 3 of 5"). The indicator is unobtrusive but lets the participant orient themselves without going back to the course home.

**Why this priority**: Nice-to-have orientation aid. The IA from US1 is the primary navigation surface; this is reinforcement.

**Independent Test**: Open any section page. Verify a small breadcrumb/indicator appears in the section header showing the group name and the section's position within the group.

**Acceptance Scenarios**:

1. **Given** a participant on `/course/values`, **When** the section header renders, **Then** a "Self Awareness · 3 of 5" affordance is visible alongside the section title.
2. **Given** a participant on `/course/visualization`, **When** the section header renders, **Then** the affordance shows "Goal Setting · 3 of 3".

---

### Edge Cases

- **Empty group**: If a group ends up with zero sections (admin misconfiguration), the group band MUST NOT render. Guard against rendering an empty header.
- **Section without a group**: If a section's `group_slug` is missing/unknown, it MUST render in a fallback "Unassigned" group band at the bottom of `/course` so that it remains discoverable rather than hidden silently. Surface a dev-console warning in non-production builds.
- **Group ordering vs section ordering**: Section `order_index` must remain globally unique and consistent with group ordering (i.e., all Self Awareness sections have lower `order_index` than all Goal Setting sections, which in turn have lower indices than Strategic Planning). Validate in a schema constraint or in seed-generation tests.
- **Re-running the migration on already-migrated data**: The migration MUST be idempotent (no errors if applied twice).
- **Question-splitting and existing participant work**: Not applicable — US4 wipes progress, so no legacy responses need to map onto the new question IDs.
- **Combined-questions rationale missing**: If `combined: true` appears without `combined_rationale`, seed generation MUST fail with a clear error (not silently accept it).

---

## Requirements *(mandatory)*

### Functional Requirements

**Information architecture**

- **FR-001**: System MUST organize the course into exactly three groups, in this order: *Self Awareness*, *Goal Setting*, *Strategic Planning*.
- **FR-002**: System MUST expose nine sections, mapped to groups as follows:
  - **Self Awareness** — `personality`, `attitude`, `values`, `roles-and-demands`, `transferable-skills`
  - **Goal Setting** — `specific-goals`, `goal-impact-matrix`, `visualization`
  - **Strategic Planning** — `removing-obstacles-achieving-goals`
- **FR-003**: Each section MUST carry a `group_slug` that identifies its group; the group's display title and order MUST be derived consistently (single source of truth, no client-side hardcoded fallback).
- **FR-004**: Section `order_index` values MUST be globally unique AND must preserve group ordering (Self Awareness sections come before Goal Setting sections, which come before Strategic Planning sections).
- **FR-005**: The course home (`/course`) MUST render the three group bands with each section card placed under the correct group header. Existing lock-cascade behavior MUST be preserved across the new section count.

**Content & exercises**

- **FR-006**: The existing `goal-setting` section MUST be decomposed into three new sections (`specific-goals`, `goal-impact-matrix`, `visualization`), each carrying a coherent subset of the existing exercises plus any new exercises required to express the corresponding workbook content.
- **FR-007**: A new section `removing-obstacles-achieving-goals` MUST contain the per-goal Removing Obstacles + Achieving Goals workbook content (psp_content.md:1669–1910), structured per US3.
- **FR-008**: A new section `visualization` MUST contain the visualization practice from psp_content.md:1598–1615, structured as an `info` reference exercise plus at least one interactive journaling exercise so the section can satisfy completion criteria.
- **FR-009**: Sections currently named `attitudes`, `roles`, and `skills` MUST be renamed to `attitude`, `roles-and-demands`, and `transferable-skills` respectively (slug and display title).
- **FR-010**: Every `structured-text` or `text` exercise in the new seed data MUST expose one `questions[]` entry per **mandatory** workbook prompt. A single shared answer surface is only permitted when the seed entry carries `combined: true` AND a non-empty `combined_rationale` string. Seed validation MUST fail loudly when this contract is violated.
- **FR-011**: End-of-course exercises currently in `goal-setting` (`success-failure-alibis`, `declaration-of-self-esteem`, `copyright-footer`) MUST be placed in the most appropriate new section per the IP review and documented in research.md.

**Data & migration**

- **FR-012**: A new migration (`014_content_restructure.sql`) MUST: (a) add the `group_slug` column to `sections` (or equivalent normalized representation per Phase 0 research), (b) wipe `responses` and `progress` rows, (c) wipe-and-reseed `sections` and `exercises` rows to the new structure, (d) leave `profiles`, `sessions`, `enrollments`, `testimonials` untouched.
- **FR-013**: The migration MUST be idempotent (safe to apply twice).
- **FR-014**: The migration MUST mirror to `supabase/migrations/` with a timestamped filename.
- **FR-015**: The seed JSON (`db/seeds/course-content.json`) MUST be regenerated from `psp_content.md` and a per-question authoring rule (US3) such that the .md remains the canonical content source.

**UI**

- **FR-016**: `CourseHome.tsx` MUST render group bands. Each band's title comes from the group metadata (FR-003).
- **FR-017**: Section locking and the Continue/Start CTA from Iteration 4 (US1) MUST continue to work across the new section count, correctly identifying the next un-locked-and-incomplete section.
- **FR-018**: `SectionPage.tsx` SHOULD display a group-context affordance (US5) — title + position within the group.
- **FR-019**: All new UI elements MUST use existing CSS tokens from `tokens.css` and existing component patterns; no new shared component is introduced without sign-off.

**IP & content integrity**

- **FR-020**: Every PSP™ attribution line, copyright notice, and "adapted with permission" phrase present in the legacy seed MUST appear in the new seed verbatim. Visualization and Removing Obstacles content MUST carry the workbook attribution alongside.
- **FR-021**: An IP review task MUST appear in tasks.md before the seed migration is committed (per Constitution §IV / Content & IP Compliance).

### Key Entities *(include if feature involves data)*

- **Section Group**: A pedagogical grouping of sections. Has a slug (`self-awareness`, `goal-setting`, `strategic-planning`), display title, optional description, and order index. Represented either as a normalized table or as a column on `sections` (Phase 0 decides).
- **Section**: Existing entity, gains a foreign key / column referencing its group. Slug rename for three sections; three new sections added; one section (`goal-setting`) decommissioned.
- **Exercise**: Existing entity, no schema change. Re-parented to new sections via seed regeneration. New exercises added for the Visualization and Removing Obstacles sections.
- **Response & Progress**: Existing entities, no schema change. **All rows wiped** by migration 014 (US4).
- **Question (within content_json)**: Implicit entity. The per-question contract from US3 elevates `content_json.questions[]` to a first-class shape with mandatory `id`, `prompt`, optional `placeholder`, and the seed-level `combined`/`combined_rationale` flags governing multi-prompt aggregation.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A participant landing on `/course` for the first time can identify the three group phases of the course in under 10 seconds (observable via the page rendering 3 group headers above the section grid).
- **SC-002**: Post-migration, `SELECT COUNT(*) FROM sections` returns exactly **9**, and `SELECT COUNT(DISTINCT group_slug) FROM sections` returns exactly **3**.
- **SC-003**: 100% of `structured-text` and `text` exercises in the new seed pass the per-question lint (FR-010): either `questions[]` length matches the workbook's mandatory-prompt count, or `combined: true` with a `combined_rationale` is present.
- **SC-004**: Migration 014 applied to a scratch DB completes in under 5 seconds and leaves `responses` + `progress` at row-count 0 while `profiles`, `sessions`, `enrollments`, `testimonials` row counts are unchanged.
- **SC-005**: The course home page passes axe-core accessibility checks (no critical violations) with the new group-band structure rendered.

*Performance baselines (per Constitution v1.0.0 — unchanged for this feature):*

- **SC-PERF-1**: Page/view initial load p95 ≤ 2 000 ms (4G simulated)
- **SC-PERF-2**: Time to Interactive p95 ≤ 3 500 ms
- **SC-PERF-3**: API read responses p99 ≤ 500 ms under expected load
- **SC-PERF-4** *(feature-specific)*: `/course` Lighthouse First Contentful Paint ≤ 1 500 ms on a 4G throttled profile, with 9 sections and 3 group bands rendered (current 6-section baseline is ~1 200 ms; allow 300 ms headroom for the additional DOM nodes). Verification: single Lighthouse run captured during the Polish phase (see tasks.md T058). The constitution-baseline p95 page-load and TTI targets (SC-PERF-1/SC-PERF-2) are captured in the same Lighthouse pass; SC-PERF-3 is inherited from the constitution and not feature-specific to this iteration (no new RPCs are introduced — see plan.md §Performance Goals).

---

## Assumptions

- **A-1**: No production participant cohort currently depends on stored progress; wiping `responses` and `progress` rows during the migration is acceptable (confirmed by user 2026-05-15).
- **A-2**: `psp_content.md` is and remains the canonical content source. The seed JSON is regenerated from it during this iteration; future content edits flow .md → seed JSON (confirmed by user 2026-05-15).
- **A-3**: No new dependencies are introduced. The work is content + IA + a single small schema column. Existing exercise renderers and the slide nav from Iteration 4 cover all new content (`info`, `structured-text`, `text`, `table`, `ranking`, `checkbox`, `rating-picker`).
- **A-4**: Testimonials remain end-of-course (`/course/complete`); they are not re-keyed to any of the new sections. The "Leave a testimonial" CTA from Iteration 4 fires from the closing screen of the final section (`removing-obstacles-achieving-goals`).
- **A-5**: The PSP™ workbook's pedagogical order (group order, section order within group) is the **authoritative** ordering. Any conflict between the legacy `order_index` values and the workbook order is resolved in favor of the workbook.
- **A-6**: Iteration 4's slide-nav UX, section-locking cascade, and Iteration 3's NULLS-NOT-DISTINCT progress-trigger contract are all in place and behave correctly across the new section count.
- **A-7**: This iteration is **not** the place to refactor exercise renderers themselves; any rendering shortcomings discovered during US3 audit are recorded as follow-up Iteration 6 work, unless they block a P1 acceptance scenario.

---

## Out of Scope

- New exercise types (the existing six cover all the new content).
- Changes to the Iteration 4 slide-nav, intro/closing slides, or section-lock UX.
- Changes to the testimonials feature.
- Admin/facilitator dashboard changes (the group/section schema change is transparent to those dashboards).
- Internationalization of group titles or section titles (English only).
- Migrating legacy participant responses into the new structure (US4 wipes them by design).
