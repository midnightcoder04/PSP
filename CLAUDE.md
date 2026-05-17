# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains a single Markdown document: `psp_content.md` — the full content of the **Personal Strategic Planning™ (PSP)** workshop guide and workbook. The PSP framework was authored by **Sam Koshy** (Compass Career Life Solutions, Winnipeg, Canada) and is facilitated by **Bijo Abraham** (Select HR Solutions, India). This is a content/editorial project, not a software project.

## Document Structure

`psp_content.md` (2098 lines) is organized into five major sections corresponding to the PSP "Five Filters" model:

1. **Personality** — D.I.S.C. model (Dominance, Influence, Steadiness, Compliance), core style identification, people-reading
2. **Attitudes** — Identifying and reframing personal attitudes
3. **Values** — Values Shopping Spree exercise, values ranking
4. **Roles & Their Demands** — Life Line exercise, "Who Am I Now?", Past Experience Inventory, Mission Statement
5. **Transferable Skills** — Skills inventory, favorite skills identification

These feed into a **Goal Setting** section (Life Goal Inventory, Cross-Impact Matrix, Goal Achievement Plan) and close with self-esteem and declaration exercises.

## Content Conventions

- **Exercises** use `☐` checkboxes for self-assessment checklists
- **Blank fields** use underscore lines (`___________`) for write-in responses
- **Tables** use GFM pipe syntax; most exercise tables have empty cells meant to be filled in by participants
- **ASCII diagrams** (using `┌─┐└┘│` box-drawing chars) represent blank drawing/writing areas for exercises like the Life Line
- **Real Life Stories** are blockquoted (`>`) first-person testimonials that appear between major sections
- **Scale indicators** follow the pattern: `LOW [0 ——— 5 ——— 10] HIGH`
- Section headings follow a consistent hierarchy: `#` for major filters, `##` for exercises/topics, `###` for sub-steps

## IP and Branding Notes

- The trademark **Personal Strategic Planning™** and **PSP™** belong to Sam Koshy / Compass Career Life Solutions
- The D.I.S.C. model is credited to Bill Bonnstetter / Target Training International
- The workshop is adapted and facilitated (not owned) by Bijo Abraham / Select HR Solutions (`share@risewithpsp.com`)
- Preserve all attribution lines, copyright notices, and "adapted with permission" language when editing content

## Working Discipline

- **Documentation-first when in doubt**: When uncertain about a library's behaviour, an API's contract, a framework feature, a CLI flag, or a schema convention, **consult the official documentation before writing or guessing code**. Prefer the project's docs site, then the package's TypeScript definitions, then a minimal verifiable test in the repo. Only fall back to memory or pattern-matching after the docs path has been exhausted. State the doc you consulted in the commit message or PR when the answer was non-obvious.
  - Examples that should trigger this rule: Supabase client method signatures, supabase-js Database type shape, Vite env var conventions, Vitest mock hoisting semantics, React Router data API surface, Recharts responsive-container quirks, Postgres function definitions in migrations.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/006-iter6-personality-watusi-polish/plan.md

(The Iteration 1+2 plan at specs/001-psp-course-platform/plan.md remains the
canonical source for the platform's technology choices and architecture.
The Iteration 3 plan at specs/002-iter2-fixes/plan.md covers the RPC test
suite + security audit. The Iteration 4 plan at specs/003-slide-nav-ux-rework/plan.md
covers slide navigation, sequential reveal, exercise UX rework, and testimonials.
The Iteration 5 content restructure at specs/004-content-restructure/plan.md
layers three groups (Self Awareness / Goal Setting / Strategic Planning), nine
sections, and the per-question answer-field rule. The Iteration 5 UX fixes plan
at specs/005-iter5-ux-fixes/plan.md covers sidebar collapse, slide-state reset
on section change, WATUSI count fix, Personality two-question quiz + four DISC
read-throughs, slide-spacing fix, info-slide single-column layout, and back-to-
course relocation. The current plan above layers Iteration 6 on top: WATUSI
ranking becomes a read-only sorted listing (no drag, no # column, count chip
inline); the Personality section gains four matched-style deep-dive slides
(Characteristics, Ideal Env, optional Traits Checklist, Comfort Zones) AFTER
the four-profile read-through; the legacy `my-core-style` text exercise is
soft-hidden; and `TextExercise` adopts the `InfoExercise` numbered/bulleted
prompt parser via a shared `markdownBlocks` helper.)
<!-- SPECKIT END -->
