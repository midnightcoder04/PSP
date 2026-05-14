---
description: "CI performance gate per Constitution §IV — deferred from Iteration 4 (003)"
---

# Feature Specification: CI Performance Gate (Iteration 5)

**Branch**: `004-perf-ci-gate` *(not yet created)*
**Date**: 2026-05-15 (stub created during Iteration 4 polish)
**Source**: Constitution §IV "Performance Standards" requires CI-blocking performance-regression detection. Iteration 4 (`003-slide-nav-ux-rework`) explicitly deferred this work — see `specs/003-slide-nav-ux-rework/plan.md` Complexity Tracking row "CI performance gate deferred to Iteration 5".

## Stub scope (to be expanded with `/speckit-specify`)

- **AC-1**: A GitHub Actions workflow runs Lighthouse against a preview deployment for every PR and posts a comment with the scores and the per-route bundle delta vs. `main`.
- **AC-2**: The workflow fails the PR check when any of: p95 LCP > 2 000 ms, TTI > 3 500 ms, Lighthouse Performance score < 90, OR participant-route gzipped bundle delta > 10 KB (Constitution §IV default).
- **AC-3**: The bundle delta computed in `specs/003-slide-nav-ux-rework/bundle-delta.md` is the baseline; subsequent iterations must not exceed it without an updated Complexity Tracking row.
- **AC-4**: The workflow is the source of truth for the perf gate. `npm run audit:security` continues to gate the security side.

## References

- Iteration 4 (003): `specs/003-slide-nav-ux-rework/`
- Iteration 4 actual bundle deltas: `specs/003-slide-nav-ux-rework/bundle-delta.md`
- Constitution §IV: `.specify/memory/constitution.md`

## Status

**Stub only** — created during Iteration 4 polish to record the deferral. Expand with `/speckit-specify` when ready to start.
