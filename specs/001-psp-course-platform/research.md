# Research: PSP Course Platform

**Feature**: 001-psp-course-platform
**Phase**: 0 — Outline & Research
**Date**: 2026-05-04

---

## 1. Frontend Architecture

**Decision**: React 18 + Vite 5 + TypeScript

**Rationale**:
- React 18 concurrent features (automatic batching, Suspense for data fetching) handle the
  progressive content-loading pattern PSP sections require.
- Vite 5 delivers sub-second HMR and optimized production builds with code-splitting by default,
  keeping initial bundle size minimal.
- TypeScript enforces correctness in Supabase query return types, which eliminates a category of
  runtime errors common in data-dense dashboards.

**Alternatives considered**:
- Next.js: Rejected. Server-side rendering adds deployment complexity (requires Node.js server)
  and the platform is primarily a client-heavy SPA. Supabase Auth sessions are client-managed.
- SvelteKit: Rejected. Smaller ecosystem; the team's React familiarity reduces onboarding risk.

---

## 2. State Management

**Decision**: React Context + `useReducer` for auth/session state only; Supabase client as the
single source of truth for all data.

**Rationale**:
- With Supabase Realtime providing live data, a client-side cache layer (Redux, Zustand) would
  duplicate state and create sync bugs. Fetching directly from Supabase and subscribing to
  Realtime channels is simpler and correct.
- Auth state (current user, role) is the only globally shared state and fits cleanly into a
  single React Context.
- Eliminates a heavy dependency (Redux toolkit is 50 KB+); aligns with the "minimal libraries"
  requirement.

**Alternatives considered**:
- Zustand: Appealing for its size, but adds a pattern layer that the Supabase client makes
  unnecessary.
- TanStack Query: Useful for caching, but Realtime subscriptions provide live updates making
  query invalidation complex. Deferred to v2 if performance profiling reveals the need.

---

## 3. Styling Approach

**Decision**: CSS Modules with CSS custom properties (design tokens); no utility-first framework.

**Rationale**:
- CSS Modules give per-component style isolation without runtime overhead (zero-cost in
  production).
- Custom properties as design tokens (colors, spacing, typography) enforce the "single design
  language" required by Constitution §III.
- Avoids Tailwind's class verbosity in JSX, which hurts readability in content-heavy components
  (PSP exercise renderers).
- Total styling footprint: ~5–8 KB gzipped, vs. Tailwind's ~8–30 KB even with PurgeCSS.

**Alternatives considered**:
- Tailwind CSS: Rejected. Verbose markup conflicts with readability principle; utility classes
  expose design token values rather than naming intent.
- styled-components / Emotion: Rejected. Runtime CSS-in-JS adds ~12 KB and introduces
  hydration complexity.

---

## 4. Supabase Integration Pattern

**Decision**: Direct Supabase client (`@supabase/supabase-js` v2) in the frontend; no separate
API server or Edge Functions.

**Rationale**:
- Supabase Row Level Security (RLS) policies enforce authorization at the database level,
  making a middleware API layer redundant for standard CRUD operations.
- All three role-based access patterns (Admin, Facilitator, Participant) are expressible as
  RLS policies using `auth.uid()` and role claims stored in the `profiles` table.
- Supabase Realtime subscriptions work natively with the same client, supporting the live
  facilitator dashboard without a separate WebSocket server.
- Aggregate stats (completion rates per session) are implemented as PostgreSQL functions
  (Supabase RPC) keeping computation server-side and response payloads small.

**Alternatives considered**:
- Supabase Edge Functions: Considered for business logic, but all required logic fits in
  PostgreSQL functions and RLS policies. Edge Functions add cold-start latency.
- External Express/Fastify API: Rejected. Contradicts "Supabase for backend, Postgres purely"
  requirement and adds deployment complexity.

---

## 5. Authentication Strategy

**Decision**: Supabase Auth with email/password; role stored in `profiles` table; role claim
injected via custom JWT claim using a Postgres function hook.

**Rationale**:
- Supabase Auth natively handles email/password, password reset emails, and session management
  (JWT + refresh tokens stored in localStorage).
- Role-based routing is handled client-side by reading `profiles.role` after login.
- RLS policies use `auth.uid()` to join `profiles` for role checks, keeping authorization
  entirely within Postgres.
- The `on_auth_user_created` Postgres trigger automatically creates a `profiles` row on signup,
  ensuring no orphaned auth users.

**Alternatives considered**:
- OAuth (Google/GitHub): Not needed; participants are provisioned by admins, not self-registering
  via social login.
- Magic link (passwordless): Rejected for participant accounts because admins set credentials;
  participants need to log in repeatedly without email access during in-room sessions.

---

## 6. Realtime Strategy for Facilitator Dashboard

**Decision**: Supabase Realtime channel subscription on the `progress` table filtered by
`session_id`, refreshing the facilitator's view on each INSERT/UPDATE event.

**Rationale**:
- Supabase Realtime uses PostgreSQL logical replication under the hood — enabling row-level
  change events without polling.
- Filtering by `session_id` ensures each facilitator only receives events for their session,
  keeping WebSocket message volume low.
- Updates propagate in < 1 s in typical Supabase deployments, well within the 5-second
  SC-004 requirement.

**Alternatives considered**:
- Polling every N seconds: Rejected. Creates unnecessary database load; Realtime is more
  efficient and provides better UX.
- Server-Sent Events: Not supported natively by Supabase; would require an Edge Function.

---

## 7. PSP Content Seeding Strategy

**Decision**: PSP course content is seeded into the `sections` and `exercises` tables from a
structured JSON seed file generated from `psp_content.md`. Content is stored as structured JSON
(not raw Markdown) in `exercises.content_json`.

**Rationale**:
- Storing content in the database allows RLS to control access (participants without enrollment
  cannot read exercises), keeping the content within the authorization boundary.
- Structured JSON per exercise type (checkbox options, table headers/rows, free-text prompts)
  enables type-safe rendering in the frontend without Markdown parsing at runtime.
- A one-time seed script processes `psp_content.md` into the exercise JSON format; thereafter
  content is managed in the database.

**Alternatives considered**:
- Serving raw Markdown files from a CDN: Rejected. Bypasses RLS; content would be publicly
  readable regardless of access control.
- Storing Markdown in the DB and parsing at runtime: Rejected. Adds a Markdown parsing library
  (remark/unified ~40 KB) to the bundle; structured JSON renders faster.

---

## 8. Charts & Statistics Library

**Decision**: Recharts (React-specific wrapper around D3) for completion statistics charts.

**Rationale**:
- Recharts is ~45 KB gzipped, significantly lighter than Chart.js (~62 KB) or ECharts (~250 KB).
- Declarative React API aligns with the component model; no imperative DOM manipulation.
- Covers all required chart types: bar charts (section completion per participant), progress
  rings (overall completion), line charts (completion over time for admins).
- Only loaded in admin/facilitator dashboard routes (code-split by Vite), so participant
  performance is unaffected.

**Alternatives considered**:
- Chart.js via react-chartjs-2: Rejected. Less idiomatic React API; requires canvas element
  management.
- D3 directly: Rejected. High complexity for the chart types needed; diminishing returns.
- No chart library (CSS only): Rejected. Completion ring and time-series charts are not
  feasible with CSS alone.

---

## 9. UI/UX Design Philosophy

**Decision**: Psychologically grounded design system inspired by cognitive load theory and
the therapeutic nature of the PSP framework.

**Rationale**:
- PSP is a reflective, identity-exploring process. The UI must be calm, trust-evoking, and
  distraction-free to support deep self-reflection.
- Color palette: warm neutral base (off-white `#FAF9F7`, stone `#4A4540`) + trust blue
  (`#2D5BE3`) + growth green (`#22A06B`) + warmth amber (`#E8974A`). All WCAG AA compliant.
- Typography: System font stack (San Francisco / Segoe UI / Ubuntu) for fast rendering; heading
  scale uses a 1.25 modular ratio; generous 1.7 line height for reflection content.
- Layout: Max-width 720 px for reading content (optimal line length 60–75 chars); 1200 px for
  dashboards. Generous 24/48 px spacing rhythm.
- Motion: CSS transitions only (transform + opacity, 200 ms ease-out); no third-party animation
  library; `prefers-reduced-motion` respected.
- Micro-interactions: Section completion triggers a subtle "bloom" CSS animation on the progress
  indicator; exercise saves show a brief checkmark fade-in to confirm persistence.

**Alternatives considered**:
- Shadcn/ui component library: Rejected. While high-quality, importing a full component system
  contradicts the "minimal libraries" principle and creates lock-in for the custom PSP exercise
  types (checkboxes, ranking tables) that have no parallel in generic UI kits.
- Material UI / Ant Design: Rejected. Corporate aesthetic conflicts with the warm,
  introspective tone required for a personal development platform.

---

## 11. Local Supabase development workflow *(Iteration 2)*

**Decision**: Adopt Supabase CLI's local stack (`supabase start`) backed by Docker, with
the existing `VITE_DEV_BYPASS` retained as a UI-only fallback path.

**Rationale**:
- Identical Postgres version, identical Auth/Realtime/Storage behaviour to production.
- Migrations applied via `supabase db reset` use the same SQL files we ship to production.
- Studio UI on `:54323` matches the production dashboard for ergonomic parity.
- Free, runs offline after the initial image pull, deletes cleanly with `supabase stop`.

**Alternatives considered**:
- **Plain Postgres + manual auth shim**: rejected — diverges from production behaviour;
  RLS policies can't be exercised without Supabase Auth.
- **Hosted dev project on supabase.com per developer**: rejected — requires internet,
  requires personal cloud project per contributor, slower iteration.
- **`VITE_DEV_BYPASS`-only as the primary path**: rejected — bypass is fine for UI-only
  work but blocks any developer trying to test RLS, RPCs, or real persistence.

---

## 12. Section-framing data shape *(Iteration 2)*

**Decision**: Single nullable `framing JSONB` column on `sections`.

**Rationale**:
- Matches the existing `exercises.content_json` pattern — reviewers already understand it.
- Schema can evolve (add `audio_url`, `hero_image_url`, etc.) without future migrations.
- Six rows × ~1 KB framing = 6 KB total payload. No indexing needed.
- NULL framing degrades gracefully (UI renders no framing block) — enables incremental
  rollout.

**Alternatives considered**:
- **Separate columns per field** (`opening_quote`, `opening_question`, …): rejected —
  requires a migration for every new framing field, and ~7 sparse columns is awkward.
- **Separate `section_framing` table**: rejected — 1:1 relationship adds a join with no
  benefit. Single-row-per-section content is what JSONB is for.

---

## 13. Test polyfill strategy for jsdom *(Iteration 2)*

**Decision**: Add `ResizeObserver`, `IntersectionObserver`, and `matchMedia` polyfills in
`src/vitest.setup.ts` using minimal in-file stubs (no extra packages).

**Rationale**:
- Recharts requires `ResizeObserver`. jsdom does not implement it.
- `IntersectionObserver` and `matchMedia` are common future failure points for any UI
  library that responds to viewport — pre-emptive coverage avoids whack-a-mole later.
- A 10-line in-file stub avoids adding `resize-observer-polyfill` (3 KB) just for tests.

**Alternatives considered**:
- **`resize-observer-polyfill` package**: rejected — would land in production bundle
  unless carefully scoped; in-file stub keeps it test-only.
- **Mock Recharts module entirely in tests**: rejected — loses the chart-rendering
  surface area that Lighthouse and visual regression need to exercise.
