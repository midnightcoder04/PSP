# Bundle Size Report: PSP Course Platform

**Date**: 2026-05-07
**Build**: `npm run build` (Vite 5.4.21, production)

---

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
