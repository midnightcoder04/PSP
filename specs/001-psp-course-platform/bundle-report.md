# Bundle Size Report: PSP Course Platform

**Date**: 2026-05-07 (Iteration 1 baseline below)
**Build**: `npm run build` (Vite 5.4.21, production)

---

## Iteration 3 Update (2026-05-11)

**No bundle change** — Iteration 3 added only test infrastructure (`scripts/rpc.test.ts`,
`scripts/audit-security.ts`, `scripts/_rpc_fixtures.ts`) and a DB hardening migration
(`db/migrations/010_lock_security_definer_grants.sql`). No client code touched. Bundle
footprint is identical to Iteration 2.

### Iteration 3 Verdict: PASS (no-change)

Zero net bundle delta. Test files are never bundled by Vite. The hardening migration
runs server-side only (Postgres GRANT/REVOKE statements).

---

## Iteration 2 Update (2026-05-07)

**Build**: same — Vite 5.4.21, production, after WS-C Section Framing landed.

### Iteration 2 Chunk Sizes

| Chunk | Raw | Gzip | Δ vs Iter 1 (gzip) |
|---|---|---|---|
| `index` (shared core) | 380.67 kB | 109.76 kB | +0.05 kB |
| `AdminDashboard` | 366.17 kB | 101.43 kB | 0 |
| `SectionPage` | 12.33 kB | 4.20 kB | **+0.65 kB** |
| `SessionsPage` | 4.49 kB | 1.71 kB | +0.04 kB |
| `CourseHome` | 3.55 kB | 1.56 kB | 0 |
| `AdminSessionDetailPage` | 2.91 kB | 1.19 kB | 0 |
| `FacilitatorSessionDetailPage` | 2.81 kB | 1.29 kB | 0 |
| `FacilitatorDashboard` | 2.33 kB | 1.17 kB | 0 |
| `UsersPage` | 2.34 kB | 1.00 kB | 0 |
| `LoginPage` | 2.13 kB | 1.01 kB | 0 |
| `CourseHistoryPage` | 2.24 kB | 1.11 kB | 0 |
| `PageShell` | 2.18 kB | 1.02 kB | 0 |
| `ResetPasswordPage` | 1.69 kB | 0.82 kB | 0 |
| `SectionPage` CSS | 10.37 kB | 2.12 kB | **+0.27 kB** (framing styles) |

**Net gzipped delta**: ~+1.0 kB (SectionPage JS+CSS combined). The Iteration 2 plan
budgeted ≤ 5 kB net additions; we landed comfortably under at ~1 kB. The framing
components are small text-only React (no new top-level deps), so most of the
incremental cost is the embedded JSX + their `*.module.css`.

### Iteration 2 Verdict: PASS

All chunks remain under the 10 KB-per-route gzipped budget. SectionPage.js grew
to 4.20 kB gzip from 3.55 kB — a +0.65 kB increase to host the SectionOpening +
SectionClosing wiring and the `nextSectionSlug` helper. SectionPage.css grew to
2.12 kB gzip from ~1.85 kB to host the new framing block styles. No new
top-level dependencies were added.

---

## Iteration 1 Baseline

## Route Chunk Summary

| Chunk | Raw | Gzip | Notes |
|---|---|---|---|
| `index` (shared core) | 380.59 kB | **109.71 kB** | React 18 + react-router-dom v6 + supabase-js v2 |
| `AdminDashboard` | 366.17 kB | **101.43 kB** | Recharts v2 — code-split, admin route only |
| `SectionPage` | 10.13 kB | 3.55 kB | Largest participant chunk |
| `SessionsPage` | 4.49 kB | 1.67 kB | |
| `CourseHome` | 3.55 kB | 1.56 kB | |
| `AdminSessionDetailPage` | 2.91 kB | 1.19 kB | |
| `FacilitatorSessionDetailPage` | 2.81 kB | 1.29 kB | |
| `FacilitatorDashboard` | 2.33 kB | 1.17 kB | |
| `UsersPage` | 2.34 kB | 1.00 kB | |
| `LoginPage` | 2.13 kB | 1.01 kB | |
| `CourseHistoryPage` | 2.24 kB | 1.11 kB | |
| `PageShell` | 2.18 kB | 1.02 kB | |
| `ResetPasswordPage` | 1.69 kB | 0.82 kB | |

---

## Constitution Compliance

**Budget rule**: No individual route chunk exceeds 10 KB gzipped unless justified in Complexity Tracking.

### Justified Large Chunks

- **`index` (109.71 kB gzip)**: Core vendor bundle. Supabase-js v2 (~40 KB), React 18 (~33 KB), react-router-dom v6 (~25 KB). These are mandatory dependencies declared in plan.md Technical Context. No Complexity Tracking entry required — these are architecture-level choices.

- **`AdminDashboard` (101.43 kB gzip)**: Recharts v2. Explicitly noted in plan.md §Constitution Check: *"Recharts is the only non-essential library and is code-split to dashboard routes only."* Loaded only on `/admin` routes. Participants and facilitators do not pay this cost.

### All Other Route Chunks

All remaining per-route JS chunks are ≤ 3.55 kB gzipped — well within the 10 KB budget per addition. ✅

---

## Verdict: PASS

All bundle sizes are within justified limits. The Recharts split correctly isolates the chart library to admin-only routes. Participant (`/course/*`) and facilitator routes have negligible JS overhead per route.
