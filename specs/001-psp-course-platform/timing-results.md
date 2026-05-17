# Timing Results — Quickstart Validation (T130 / replaces T085)

**Purpose**: Capture measured timings for the user-facing performance gates from `spec.md`'s
Success Criteria (SC-001, SC-003, SC-004). Each row pairs a budget with a checkbox the
maintainer ticks once they've measured against the hosted Supabase project.

**Hosted project**: `okedskadkspeiyxjslqc` (PSP)
**Run prerequisites**:
- `.env.local` populated with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- Migrations + seed already applied (T100 / T102 — done 2026-05-10 via MCP)
- Admin user created (T101) and a facilitator + participant available

**Methodology**: open DevTools → Performance / Network panel; use a stopwatch for cross-tab measurements. Run on a "good 4G" throttled profile in Chrome to mirror the Iteration 1 SC budget assumption.

---

## SC-001 · Resume in ≤ 10 s

> A returning participant lands on their last in-progress exercise within 10 seconds of clicking the magic-link / submitting credentials.

| Step | Budget | Measured | ✓ |
|---|---|---|---|
| `/login` POST → `auth.signInWithPassword` resolves | ≤ 2 s | _____ s | [ ] |
| Navigation to `/course` after `SIGNED_IN` | ≤ 1 s | _____ s | [ ] |
| `get_resume_position` RPC round-trip | ≤ 1 s | _____ s | [ ] |
| Redirect to `/course/:sectionSlug` + first paint | ≤ 4 s | _____ s | [ ] |
| Scroll-into-view of last exercise | ≤ 2 s | _____ s | [ ] |
| **End-to-end (login click → exercise visible)** | **≤ 10 s** | **_____ s** | [ ] |

**Result**: ☐ pass · ☐ fail (annotate which step blew budget)

---

## SC-003 · Admin onboarding in ≤ 3 min

> An admin starting from the bare hosted project can have a usable session live (admin → facilitator → session → enrolled participant) in under 3 minutes.

| Step | Budget | Measured | ✓ |
|---|---|---|---|
| Admin signs in at `/login` | ≤ 15 s | _____ s | [ ] |
| `/admin/users` → "Add user" → create facilitator (Edge Function `create-user`) | ≤ 30 s | _____ s | [ ] |
| `/admin/sessions` → "New Session" modal → save | ≤ 30 s | _____ s | [ ] |
| `/admin/sessions/:id` → enroll participant from dropdown | ≤ 30 s | _____ s | [ ] |
| Sanity-check: facilitator sees the session at `/facilitator` | ≤ 15 s | _____ s | [ ] |
| **End-to-end (sign-in → enrolled participant visible)** | **≤ 3 min** | **_____ s** | [ ] |

**Result**: ☐ pass · ☐ fail

---

## SC-004 · Live dashboard update in ≤ 5 s

> A facilitator with `/facilitator/sessions/:id` open sees a participant's completion percentage tick within 5 seconds of the participant marking an exercise complete in another tab.

| Step | Budget | Measured | ✓ |
|---|---|---|---|
| Tab A (participant) clicks "Mark complete" → response saved | ≤ 1 s | _____ s | [ ] |
| `progress` row update + Realtime broadcast | ≤ 1 s | _____ s | [ ] |
| Tab B (facilitator) `useRealtimeSession` fires re-fetch | ≤ 1 s | _____ s | [ ] |
| Updated stat cards repaint | ≤ 2 s | _____ s | [ ] |
| **End-to-end (participant click → facilitator UI updated)** | **≤ 5 s** | **_____ s** | [ ] |

**Result**: ☐ pass · ☐ fail

---

## Notes & exceptions

_(record any environmental caveats, e.g. cold-start latency on the first request after a long idle, mobile-vs-desktop disparities, ad-blocker interference.)_

---

## Sign-off

- [ ] All three success criteria measured and within budget.
- [ ] Any failures have a follow-up issue tracked.
- Measured by: _____________ on _________ (date).
