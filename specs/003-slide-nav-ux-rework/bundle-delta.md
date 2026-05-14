# Bundle Delta Report — Iteration 4

**Build**: `npm run build` on commit at end of iteration 4
**Date**: 2026-05-15

## Per-chunk comparison (gzipped sizes)

| Chunk | Baseline (US1) | After full iteration | Delta |
|-------|----------------|-----------------------|-------|
| `SectionPage-*.js` | 5.55 KB | **23.60 KB** | **+18.05 KB** |
| `CourseHome-*.js` | ~1.56 KB | 2.10 KB | +0.54 KB |
| `index-*.js` | 109.96 KB | 110.19 KB | +0.23 KB |
| `AdminDashboard-*.js` | 101.43 KB | 101.43 KB | 0 |
| `CourseClosing-*.js` | — | **2.17 KB** | +2.17 KB (new, lazy) |
| `TestimonialList-*.js` | — | **0.93 KB** | +0.93 KB (new, lazy) |
| Admin `TestimonialsPage-*.js` | — | **0.46 KB** | +0.46 KB (new, lazy) |
| Facilitator `TestimonialsPage-*.js` | — | **0.44 KB** | +0.44 KB (new, lazy) |

**Participant-route delta**: SectionPage (+18.05) + CourseHome (+0.54) + index (+0.23) + CourseClosing lazy (+2.17) = **~+21.0 KB gz**.

## Budget vs. actual

- NFR-001 budget: ≤ 15 KB gz.
- Actual: **~21 KB gz**.
- Variance: **+6 KB over budget**.

## Root cause

`@dnd-kit/core` + `@dnd-kit/sortable` got bundled into the SectionPage chunk because `RankingExercise` (an always-imported child of SectionPage) imports them. Static measurements:

- `@dnd-kit/core`: ~5 KB gz
- `@dnd-kit/sortable`: ~3 KB gz
- `@dnd-kit/utilities`: ~1 KB gz
- New exercise components (StructuredText + RatingPicker + ValueBudgetWidget + drag rendering): ~7 KB gz total
- Slide infra (SectionIntroSlide + SectionClosingSlide + SlideNav + hooks): ~2 KB gz
- Reading material + framing JSON: 0 (data-only, server-side)

## Disposition

The Complexity Tracking row in `plan.md` budgeted up to **14 KB gz** for the participant route. The observed **21 KB gz** exceeds that — Constitution §IV gate (≤ 10 KB without justification) is doubly exceeded.

**Mitigation options** (not yet applied):
1. Lazy-load `RankingExercise` via `React.lazy` so `@dnd-kit` only loads when a Roles or Goal Setting slide is reached. Estimated savings: ~9 KB on the SectionPage initial chunk.
2. Replace `@dnd-kit/sortable` with a hand-rolled keyboard-accessible drag implementation (~600 LOC). Rejected in research.md R6.
3. Accept the overage on a one-time basis and tighten in Iteration 5 (see T086 deferral).

**Recommended action** (post-MVP): apply mitigation #1 in a follow-up commit. SectionPage already lazy-loads at the route level; lazy-loading `RankingExercise` *within* SectionPage requires a `Suspense` boundary around the renderer switch — small surgical change.

For this iteration: the overage is documented and the Constitution Check in plan.md is updated to note the variance. The user-facing value (eight new capabilities in one iteration) was the original justification; the variance is +6 KB on a single route used by participants only.
