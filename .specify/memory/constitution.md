<!-- Sync Impact Report
Version change: N/A → 1.0.0 (initial ratification)
Added sections:
  - I. Code Quality (new)
  - II. Test-First Development (new)
  - III. User Experience Consistency (new)
  - IV. Performance Standards (new)
  - Content & IP Compliance (new)
  - Development Workflow (new)
  - Governance (new)
Modified principles: none (initial ratification)
Removed sections: none (initial)
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gates now defined
  ✅ .specify/templates/spec-template.md — Success Criteria metrics align with performance principle
  ✅ .specify/templates/tasks-template.md — Task types reflect testing and observability disciplines
  ⚠ .specify/templates/commands/ — directory not present; no updates needed
Follow-up TODOs: none — all fields resolved
-->

# RwPSP Constitution

## Core Principles

### I. Code Quality

Every line of code merged to the main branch MUST be readable, purposeful, and maintainable by
any team member without additional explanation.

- All code MUST pass linting and formatting checks (project-configured toolchain) before review.
- Functions and variables MUST use consistent, descriptive naming that reflects domain language.
- Dead code, commented-out blocks, and unused imports MUST NOT be merged.
- Each pull request MUST receive at least one peer review and receive explicit approval before merge.
- Complexity MUST be justified in the plan's Complexity Tracking table; unexplained complexity is
  a blocking violation.

**Rationale**: Unreviewed or inconsistently formatted code compounds debt faster than features
deliver value. The PSP content domain requires clarity at every layer — the codebase must model
the same standard.

### II. Test-First Development (NON-NEGOTIABLE)

Tests MUST be written before implementation. No feature implementation task may begin until its
corresponding tests exist and are confirmed to fail (Red phase).

- The Red → Green → Refactor cycle is strictly enforced for all new functional code.
- Unit tests MUST cover all public interfaces and edge cases identified in the feature spec.
- Integration tests MUST cover inter-service contracts and any shared schema changes.
- Tests MUST NOT use mocks in place of real database or external-service calls where the contract
  is under active development — integration tests MUST hit real adapters.
- A task MUST NOT be marked complete if its associated tests do not pass.

**Rationale**: Test-first discipline catches interface mismatches before they reach production.
For a content-delivery platform built on licensed IP, correctness is non-negotiable — broken
behavior erodes facilitator and participant trust immediately.

### III. User Experience Consistency

All user-facing surfaces MUST conform to a single, coherent design language derived from the
PSP™ workshop's visual and structural conventions.

- UI components MUST be sourced from the project's shared component library; one-off implementations
  are not permitted without prior constitutional amendment.
- Content rendering MUST respect PSP™ formatting conventions: `☐` checkboxes, `___________` fill
  fields, GFM pipe tables, blockquote testimonials, and scale indicators as documented in CLAUDE.md.
- Navigation patterns, typography scales, and interaction behaviors MUST remain consistent across
  all five PSP Filter sections and the Goal Setting section.
- Any change to a shared component MUST be validated across all surfaces that use it before merge.
- Accessibility: all interactive elements MUST meet WCAG 2.1 Level AA compliance.

**Rationale**: Participants experience the PSP framework as a coherent journey. Inconsistent UI
breaks that journey and undermines the workshop's pedagogical intent.

### IV. Performance Standards

Every feature MUST meet defined performance targets before it is considered shippable.

- Page/view initial load: p95 ≤ 2 000 ms on a 4G connection (simulated via DevTools throttling).
- Time to Interactive (TTI): p95 ≤ 3 500 ms.
- API responses (read operations): p99 ≤ 500 ms under expected concurrent load.
- Client-side bundle additions MUST NOT increase the total gzipped bundle by more than 10 KB
  without a documented justification in the plan's Complexity Tracking table.
- Performance regressions detected in CI MUST be treated as blocking failures equivalent to
  test failures.

**Rationale**: Workshop participants access the platform across a wide range of devices and
network conditions, including from facilitator-led sessions with shared connections. Sluggish
responses interrupt reflection exercises and erode session quality.

## Content & IP Compliance

All features that surface, transform, or reference PSP™ content MUST comply with the following:

- Attribution lines, copyright notices, and "adapted with permission" language present in
  `psp_content.md` MUST be preserved verbatim in any rendered output.
- The trademarks **Personal Strategic Planning™** and **PSP™** (Sam Koshy / Compass Career Life
  Solutions) and the D.I.S.C. model credit (Bill Bonnstetter / Target Training International)
  MUST NOT be altered or removed.
- Features that display or distribute workbook content MUST be scoped to authorized use by
  Bijo Abraham / Select HR Solutions (`share@risewithpsp.com`) and workshop participants only.
- Any feature that modifies content structure MUST undergo an IP review step before implementation
  begins; this MUST appear as an explicit task in `tasks.md`.

## Development Workflow

- Branches MUST follow the naming convention enforced by `/speckit-git-feature`
  (sequential or timestamp-prefixed feature slugs).
- The Speckit artifact sequence MUST be followed in order: `spec.md` → `plan.md` → `tasks.md`
  → implementation. Skipping phases is not permitted.
- Every task in `tasks.md` MUST be committed (or grouped into a logical commit) upon completion;
  long-running uncommitted states are not permitted.
- The `Constitution Check` section in `plan.md` MUST be completed and signed off before Phase 0
  research begins and re-verified after Phase 1 design.
- Constitution Check gates for each feature MUST verify:
  1. All public interfaces have tests written and confirmed failing before implementation.
  2. Performance targets are specified in `plan.md` Technical Context.
  3. Any new UI component is added to the shared component library, not created ad hoc.
  4. IP compliance review task is present in `tasks.md` for any content-touching feature.

## Governance

This constitution supersedes all other project practices. In cases of conflict, the constitution
takes precedence.

**Amendment procedure**:

1. Propose the amendment in a dedicated PR with a description of the change and its rationale.
2. Obtain approval from at least one project maintainer.
3. Update the version line following semantic versioning rules (see below).
4. Run `/speckit-constitution` to propagate changes to all dependent templates.
5. Document the amendment in the Sync Impact Report (HTML comment at top of this file).

**Versioning policy**:

- MAJOR bump: Backward-incompatible removals or redefinitions of existing principles.
- MINOR bump: New principle or section added, or material expansion of existing guidance.
- PATCH bump: Clarifications, wording improvements, or typo corrections with no semantic change.

**Compliance review**: Every pull request description MUST include a `Constitution Check` section
confirming compliance with each applicable principle. Reviewers MUST reject PRs that omit or fail
this check.

**Version**: 1.0.0 | **Ratified**: 2026-05-04 | **Last Amended**: 2026-05-04
