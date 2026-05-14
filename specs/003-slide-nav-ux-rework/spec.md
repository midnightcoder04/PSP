---
description: "Slide-based section navigation, sequential exercise reveal, section locking, exercise UX rework, and testimonials"
---

# Feature Specification: Slide Navigation, Sequential Reveal, Exercise UX Rework & Testimonials (Iteration 4)

**Branch**: `003-slide-nav-ux-rework`
**Date**: 2026-05-15
**Driving direction**:

The platform currently renders each PSP section as a single scrollable page with all exercises listed at once. Participants miss the workshop's intentional pacing (a quote, a question, a moment of preparation, then one exercise at a time). Several exercises also have ergonomics problems: the Values Shopping Spree table doesn't track the running total, the WATUSI ranking forces the participant to manually count what the checklist already implies, Roles ranking uses up/down buttons instead of drag-and-drop, and the Past Experience / Contract / Mission exercises are single huge textareas that hide the actual structure of the workbook.

This iteration reshapes the participant experience and adds a testimonials capability that closes the workshop loop for facilitators and admins.

## User Scenarios & Testing

### Primary flow (participant)

1. Participant logs in and lands on **My Course**. They see all six sections (Personality, Attitudes, Values, Roles & Their Demands, Transferable Skills, Setting Goals). Only Personality is unlocked; the rest show a lock icon and a "Complete *previous section* first" hint.
2. They open Personality. A full-screen **intro slide** shows the opening quote, the opening question, "why this matters", and (if defined) an "Anything to read" block. A **Begin →** button advances to exercise 1.
3. Each exercise is its own slide. A **left arrow** returns to the previous slide. A **right arrow** is disabled until the current exercise is marked complete; once complete, it advances to the next exercise (or to the section closing slide).
4. After Personality is 100% complete, the participant returns to My Course; Attitudes is now unlocked.
5. In Attitudes they reach the WATUSI checklist. As they tick statements, a **count badge per attitude type (W/A/T/U/S/I)** updates live below. The next slide (the same logical step — same slide group) shows the **ranked attitude types**, prefilled and re-ranked automatically based on the counts. Drag-and-drop the prefilled ranking only if they want to override ties; the *counts themselves* cannot be edited directly.
6. In Values they encounter the **Values Shopping Spree** — a redesigned table where a **floating "Spent / Remaining" widget** sticks to the corner of the viewport. The **Proceed →** button on the next slide is disabled until total spend equals exactly $100,000.
7. In Roles & Their Demands the ranking exercises use **drag-and-drop** to reorder items.
8. **Past Experience Inventory** appears as **14 individually-labelled questions** (each a small textarea) instead of one giant text field; same for **A Contract With Myself** (6 articles) and **My Mission Statement** (5 dimensions). Each sub-question is required in the UI before the slide can advance.
9. In **Transferable Skills** the skill-rating exercise uses a **1–5 segmented picker** (radio-group style, one click per skill) rather than free text or table cells.
10. After completing the final section (Setting Goals), the course closing screen offers **"Leave a testimonial"**. The participant writes a short testimonial and optionally a 1–5 star rating. Submitting stores it against the most recent session the participant was enrolled in (so the facilitator is implicitly attached).
11. Admin and Facilitator dashboards gain a **Testimonials** tab/section: Admin sees all testimonials; Facilitator sees only the ones from their own sessions.

### Acceptance criteria

- **AC-1 (Section intro slide)**: Each of the six sections has an intro slide that renders, in order: opening quote (with attribution), opening question, "Why this matters", and a "Anything to read" block when `framing.reading_material` is non-null. The intro slide has a **Begin →** primary action.

- **AC-2 (Sequential exercise reveal)**: The section page renders exactly one exercise (or the intro/closing slide) at a time. The right-arrow control is disabled when the current exercise is not yet complete; pressing the left arrow always returns to the previous slide. The first slide hides the left arrow; the closing slide replaces the right arrow with a **Finish section** action.

- **AC-3 (Section locking)**: On My Course, section *N* is interactive iff `N === 0` or the section at index `N-1` has `progress.section_completed_at != null` for the current participant. Locked sections show a lock icon, are non-keyboard-focusable as the "open" action, and display "Complete *{previous title}* first" on hover/focus.

- **AC-4 (WATUSI auto-count + linked rank slide)**: The WATUSI checklist exercise computes counts per group (W/A/T/U/S/I) live as the participant ticks items. The ranking slide for the six attitude types renders with the order pre-derived from those counts (descending count, then alphabetical W,A,T,U,S,I as tiebreaker). The displayed counts beneath each ranked item are **read-only**; editing a checklist tick instantly updates the counts and re-derives the prefilled order. The ranking can still be manually reordered (drag-and-drop) when the participant disagrees with ties — this manual override is what is saved. Both exercises live on **one logical slide** (single navigation step) so the participant sees cause-and-effect together.

- **AC-5 (Values floating widget)**: While entering values in the Shopping Spree table, a fixed-position widget shows **Spent: $X / Remaining: $Y** with `Y = 100,000 - X`. The widget recolours when `Y < 0` (over-budget) and when `Y === 0` (perfectly allocated). The follow-on slide's **Proceed →** button is disabled unless `X === 100,000`.

- **AC-6 (Drag-and-drop ranking — Roles)**: Roles ranking exercises support mouse drag, touch drag, and keyboard reordering (Up/Down arrow + Enter to grab/drop) for full accessibility. The persisted shape (`{ order: string[] }`) is unchanged so existing data continues to render.

- **AC-7 (Multi-question structured text exercises)**: Past Experience Inventory persists as `{ answers: { [questionId: string]: string } }` with 14 question slots; Contract With Myself with 6 article slots; Mission Statement with 5 dimension slots. The DB column type is unchanged (`responses.response_json` is JSONB) but the **frontend requires every slot to be non-empty** before marking the exercise complete. Sub-answers may be null in the DB to permit partial saves (auto-save), but the slide-advance check uses the all-filled rule.

- **AC-8 (Transferable Skills 1–5 picker)**: The "Determining My Transferable Skills" exercise displays each skill with five mutually-exclusive radio buttons (1=Strongly Disagree → 5=Strongly Agree). Persisted as `{ ratings: { [skillId: string]: 1 | 2 | 3 | 4 | 5 } }`. Complete when every skill has a rating.

- **AC-9 (Goal Setting refinements)**: The Goal Setting section adopts the same patterns it can reuse: structured multi-question text where applicable; numeric/picker inputs where 1–5 ratings appear; and the slide nav from AC-1/AC-2. No new exercise *kinds* invented here — only application of patterns introduced in AC-4 through AC-8.

- **AC-10 (Testimonial submission)**: On the course-completion screen the participant sees a **Leave a testimonial** button. It opens a form: a required `content` textarea (≥ 50 chars, ≤ 1 500 chars), an optional integer rating 1–5, and a submit. Submitting inserts into a new `testimonials` table keyed by `(participant_id, session_id)`, with `session_id` resolved to the most recent active enrollment for the participant. Re-submitting updates the existing row (uniqueness on participant+session enforces "one testimonial per session per participant").

- **AC-11 (Testimonial visibility)**: Admin Dashboard shows a **Testimonials** view with all rows, columns: participant display name, facilitator display name, session title, rating, content excerpt, submitted_at, plus a row-click to view full content. Facilitator Dashboard's Testimonials view filters to `sessions.facilitator_id = auth.uid()`.

- **AC-12 (RLS for testimonials)**:
  - Participants: can `insert`/`update`/`select` only rows where `participant_id = auth.uid()`.
  - Facilitators: can `select` rows whose `session_id` belongs to a session they facilitate.
  - Admins: can `select` all rows.
  - No one but the participant can update or delete a testimonial.

### Out of scope

- Public-facing testimonial display (e.g., a marketing-site widget) — only in-app dashboards in this iteration.
- Testimonial moderation workflow (approve/reject states) — defer to Iteration 5.
- Localisation of new UI strings — English only this iteration.
- Animated slide transitions beyond a CSS slide/fade (no spring physics, no parallax).
- Importing existing free-text responses into the new structured fields automatically — old responses migrate to a single bucketed answer (`{ "_legacy": "..." }`) and the participant is asked to re-fill.

## Requirements

### Functional Requirements

- **FR-001 (slide state machine)**: SectionPage MUST own a `currentSlide` integer state: `-1` = intro, `0..N-1` = exercises (where some exercise *pairs* may share a slide, see FR-005), `N` = closing slide. Navigation MUST be via explicit prev/next buttons and MUST NOT hijack global keyboard arrow keys (would conflict with text inputs).
- **FR-002 (resume position)**: On entering a section the initial `currentSlide` MUST be derived from `progress.last_exercise_id` for that section (or `-1` if absent). When all exercises are complete on entry, start at the closing slide (`N`).
- **FR-003 (right-arrow gate)**: For exercise slides, the right arrow MUST be disabled unless `responses[exerciseId].is_complete === true` (or the exercise is type `info`). For the intro and closing slides, the right arrow MUST always be enabled.
- **FR-004 (section lock)**: My Course MUST compute a `locked` boolean per section: `index > 0 && progressMap[sections[index-1].id]?.section_completed_at == null`. Locked sections' "open" action MUST be a no-op with an accessible message.
- **FR-005 (linked-slide grouping)**: A new optional `exercises.slide_group` integer column allows two exercises with the same `(section_id, slide_group)` to render on one slide (used by WATUSI checklist + ranking). Default `slide_group = order_index` (each exercise on its own slide).
- **FR-006 (WATUSI count derivation)**: The ranking exercise's prefilled order MUST be computed client-side from the checklist response: for each group prefix in `{w,a,t,u,s,i}`, count items whose `id` starts with `${prefix}_`; sort by count desc, then by `WATUSI` order (W,A,T,U,S,I) as tiebreaker; render counts beneath each ranked item; counts are NEVER editable directly.
- **FR-007 (Values total tracker)**: The Shopping Spree exercise (a table where each row is `[amount, item]`) MUST surface a `total` derived as `sum(parseFloat(row[amountColIndex]) || 0)` and persist it alongside rows: `{ rows: string[][], total_spent: number }`. The follow-on **Proceed** slide MUST gate on `total_spent === 100000`.
- **FR-008 (drag-and-drop ranking)**: A new `ranking` exercise sub-mode `interaction: "drag" | "buttons"` (default `"buttons"` to preserve existing UX). Roles exercises use `"drag"`. Persistence shape unchanged.
- **FR-009 (structured-text exercise)**: A new exercise type `structured-text` with `content_json.questions: { id: string, label: string, placeholder?: string, min_length?: number }[]` and response shape `{ answers: { [id: string]: string } }`. Marked complete when every question's answer length ≥ its `min_length` (default 1).
- **FR-010 (rating-picker exercise)**: A new exercise type `rating-picker` with `content_json.items: { id: string, label: string }[]` and `scale: { min: number, max: number, labels?: string[] }`. Response shape `{ ratings: { [id: string]: number } }`. Complete when every item has a rating in `[min, max]`.
- **FR-011 (testimonials table)**: A new table `testimonials(id uuid pk, participant_id uuid fk, session_id uuid fk, content text not null, rating int null check (rating between 1 and 5), submitted_at timestamptz default now(), updated_at timestamptz default now(), unique(participant_id, session_id))`.
- **FR-012 (testimonials RLS)**: As per AC-12.
- **FR-013 (dashboard views)**: Admin + Facilitator dashboards each gain a `/admin/testimonials` and `/facilitator/testimonials` route plus a sidebar/menu entry, listing the testimonials each respective role is allowed to see.

### Non-Functional Requirements

- **NFR-001 (bundle ≤ +15 KB gz)**: Net JS added MUST be ≤ 15 KB gzipped. Drag-and-drop library budget: 8 KB.
- **NFR-002 (no new top-level deps without justification)**: Only `@dnd-kit/core` + `@dnd-kit/sortable` are pre-approved. Any other new dep needs an entry in plan.md Complexity Tracking.
- **NFR-003 (accessibility)**: All new UI MUST meet WCAG 2.1 AA: drag-and-drop has keyboard fallback, picker is operable by keyboard, slide nav buttons have visible focus and aria-labels.
- **NFR-004 (test-first)**: Each new component/exercise type ships with at least one failing test (Red) before implementation begins.
- **NFR-005 (no regression)**: All existing tests (≥ 102) MUST continue to pass.

## Success Criteria

### Buildable

- **SC-001**: A new participant completes Personality → My Course shows Attitudes unlocked, all others still locked. Repeated on each section produces correct progressive unlocking.
- **SC-002**: WATUSI: ticking 7 W-items + 3 S-items results in W leading the prefilled ranking with count badge "7", S in position 2 with "3", others sorted with count badge "0".
- **SC-003**: Values: entering exactly `[20000, 30000, 50000]` enables the Proceed button; entering `99999` keeps it disabled.
- **SC-004**: A facilitator opens their dashboard's Testimonials view and sees exactly the testimonials authored by participants enrolled in any of their `sessions`. Cross-facilitator leakage is denied by RLS (verified by integration test).
- **SC-005**: All 14 Past Experience questions render as separate textareas with their own labels; saving requires each to be non-empty; the response JSON shape is `{ answers: { q1: "...", q2: "...", ... q14: "..." } }`.

### Quality goal (non-buildable, not gated)

- **SC-006**: Facilitators report (subjectively, in next workshop debrief) that participants reach the closing slide of each section more reliably than in iteration 2's single-page layout. Subjective; not asserted by a test.

## Open Questions

- **Q1**: Does "anything to read" content need IP/legal review per section? — *Resolution proposal*: yes; treat the seeded content as drafts to be approved by Bijo before merge (mirrors iteration 2 framing review).
- **Q2**: For testimonials linked to multiple sessions (rare — a participant in two cohorts), which session is "the" session? — *Resolution proposal*: most recent enrollment (`enrollments.enrolled_at DESC LIMIT 1` at submission time); store the resolved `session_id` so it never changes after submission.
- **Q3**: Should existing free-text responses for Past Experience / Contract / Mission be auto-migrated? — *Resolution proposal*: no — store them under `{ _legacy: "..." }` and re-prompt the participant; document this in quickstart.md.
