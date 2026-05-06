# Implementation Plan: PSP Course Platform — Iteration 2 (Tests, Local Supabase, Rich Section Framing)

**Branch**: `001-psp-course-platform` | **Date**: 2026-05-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-psp-course-platform/spec.md` + user direction
2026-05-07: *"Update plan to ensure all tests are done. Setup local supabase queries to migrate,
and maybe seeds. And then implement the course content in the UI in detail with thought to each
section, maybe even some quotes on each section relating to the section, or a question before
going into the section to help the facilitator convey a message to the participants."*

## Summary

Iteration 1 of this feature shipped the full three-portal SPA (admin, facilitator, participant)
with the database schema, RLS, real-time subscriptions, and exercise renderers — see
`tasks.md` (T001–T086). Iteration 2 closes the remaining quality and content gaps:

- **WS-A · Test suite repair**: bring 18 currently failing Vitest cases to green so the
  Test-First gate (Constitution §II) is honoured end-to-end.
- **WS-B · Local Supabase workflow**: make the platform runnable end-to-end on a developer
  laptop without going to supabase.com — Docker + Supabase CLI + automated migrate+seed.
- **WS-C · Section framing & richer course content**: each of the six PSP sections gains
  facilitator-facing framing (an opening quote, a reflective question, a "facilitator says"
  cue, a "why this matters" paragraph, a closing reflection, and a bridge to the next
  filter) so the platform doesn't just *deliver* the workshop — it *teaches the facilitator
  how to deliver* it.

The technical approach is **conservative**: no new architectural primitives, no new top-level
dependencies. WS-A is bug-fix work. WS-B is tooling + scripts. WS-C adds one JSONB column to
`sections`, two presentational components, and a content authoring pass.

---

## Brainstorm — "Make ideas first" (per user direction)

This section is intentionally exploratory. The technical sections that follow lock in only
the parts of these ideas that survived a Constitution Check.

> **⚠️ These framing drafts are frozen for context only. The source of truth for what gets
> seeded into `sections.framing` is `framing-content.md`. If you need to change framing
> language, edit that file — not this brainstorm.** *(analysis L8, 2026-05-07)*

### Why each section needs framing

The PSP™ workbook is dense. A participant clicking into "Personality" sees a D.I.S.C.
exercise and then another one and then another. The facilitator, when running a live
workshop, opens each section with a story or a question — that anchoring is invisible in
the static workbook. **The platform should make it visible** so:

- A participant going through the course solo gets the same anchoring a workshop attendee
  would get.
- A facilitator running a session in person has the *exact* prompt they can read aloud,
  removing the "what do I say to start this section?" cognitive load.

This is what "implement the course content in the UI in detail with thought to each
section" means in practice.

### Per-section framing — initial ideas

These are *seed drafts*. They need Bijo's review before shipping (see Open Question Q3).

#### 1 · Personality (D.I.S.C.)

- **Opening quote**: *"Until you make the unconscious conscious, it will direct your life
  and you will call it fate."* — Carl Jung
- **Opening question**: *"If we asked the five people closest to you to describe how you
  make decisions, would they all give the same answer?"*
- **Facilitator says**: *"D.I.S.C. isn't a label — it's a mirror. Today we're going to look
  at how you naturally show up, before we look at how you choose to show up."*
- **Why this matters**: Strategy starts with self-knowledge. You can't plan a life you
  don't understand.
- **Closing reflection**: *"What is one D.I.S.C. trait that helps you, and one that gets in
  your way?"*
- **Bridge to next**: *"Knowing your style is one filter. Now we look at the lenses you see
  through it: your attitudes."*

#### 2 · Attitudes

- **Opening quote**: *"Between stimulus and response there is a space. In that space is our
  power to choose our response."* — Viktor Frankl
- **Opening question**: *"What is one belief you hold about yourself that you have never
  actually questioned?"*
- **Facilitator says**: *"Attitudes are the lenses we look through. We rarely notice them
  — but they shape every decision we make."*
- **Why this matters**: Even with the right personality and skills, the wrong attitude
  will sabotage you. We surface them so you can choose them.
- **Closing reflection**: *"Which one attitude — if you changed it tomorrow — would
  change the most about your life?"*
- **Bridge to next**: *"Attitudes are HOW you see. Values are WHAT you protect. Let's go
  there next."*

#### 3 · Values

- **Opening quote**: *"It's not hard to make decisions when you know what your values are."*
  — Roy Disney
- **Opening question**: *"If you had to give up everything you own except five things — and
  not material things, but five values — what would you protect?"*
- **Facilitator says**: *"Values aren't what we say we believe. They are what we *spend* on
  — time, energy, attention. Today we make that visible."*
- **Why this matters**: Values are your compass. The Goal Setting later in this course only
  works if you have named which direction is north.
- **Closing reflection**: *"Which of your top five values is currently underfed?"*
- **Bridge to next**: *"You know your style, your lenses, your compass. Now: what hats are
  you actually wearing day-to-day?"*

#### 4 · Roles & Their Demands

- **Opening quote**: *"You can do anything, but not everything."* — David Allen
- **Opening question**: *"If someone made a documentary of your last 30 days, how many
  different characters would you play in it?"*
- **Facilitator says**: *"We all wear multiple hats. The question isn't whether — it's
  whether each hat is one we still want to wear, or one we just inherited."*
- **Why this matters**: Roles consume your hours. If you don't audit them, they will
  consume your life.
- **Closing reflection**: *"Which role on your list deserves more time than it currently
  gets?"*
- **Bridge to next**: *"Roles are demands on your time. Skills are what travel with you
  through every role. Let's catalogue them."*

#### 5 · Transferable Skills

- **Opening quote**: *"Your work is going to fill a large part of your life, and the only
  way to be truly satisfied is to do what you believe is great work."* — Steve Jobs
- **Opening question**: *"What is something you do well that other people seem to find
  difficult?"*
- **Facilitator says**: *"Skills aren't just job descriptions. They are patterns — and
  patterns travel with you wherever you go."*
- **Why this matters**: Knowing your transferable skills means you are never trapped in one
  role. Strategy needs options.
- **Closing reflection**: *"Which one skill, if developed, would unlock the most doors for
  you next year?"*
- **Bridge to next**: *"You have your style, lenses, compass, hats, and toolkit. Now we put
  it all together — into goals."*

#### 6 · Setting Goals

- **Opening quote**: *"A goal without a plan is just a wish."* — Antoine de Saint-Exupéry
- **Opening question**: *"If your future self — five years from now — could send you one
  sentence, what would it be?"*
- **Facilitator says**: *"Now we put it together. Personality + Attitudes + Values + Roles
  + Skills = the lens through which you set goals that are actually yours."*
- **Why this matters**: This is where Personal Strategic Planning earns its name.
  Everything before this was preparation.
- **Closing reflection**: *"Which goal on your list scares you the most? That one is
  probably the most important."*
- **Bridge to next**: *(none — this is the final section)*

### Design choices the brainstorm forced

1. **Framing is per-section, not per-exercise.** Per-exercise framing would balloon content
   and dilute the message. Per-section is the right altitude.
2. **Framing is always visible to all roles.** No hidden "facilitator-only" mode in v2 —
   the participant benefits from seeing what the facilitator sees, and it lowers the barrier
   for self-paced learners. (See Open Question Q1.)
3. **The closing reflection is a prompt, not a saved exercise.** Saving it would require a
   new exercise type and bloat the response store. Participants reflect; nothing is recorded.
   (See Open Question Q2.)
4. **Quotes are short (≤25 words) and from named, widely attributed sources.** This keeps
   us safely in fair-use territory and away from licensed quote anthologies.
5. **No audio, no images, no video in v2.** The framing schema leaves room for them
   (`hero_image_url`, `audio_url`) but v2 ships text-only.

---

## Technical Context

**Language/Version**: TypeScript 5.5 + React 18.3 + Vite 5.4 *(unchanged from Iteration 1)*
**Primary Dependencies**: `@supabase/supabase-js` v2.105, `react-router-dom` v6.26,
  `recharts` v2.12 *(unchanged)*
**Storage**: Supabase PostgreSQL 15 — **Iteration 2 adds local Docker stack via Supabase CLI**
  for development; production remains on managed Supabase
**Testing**: Vitest + `@testing-library/react` *(unchanged; jsdom polyfills added)*
**Target Platform**: Web — modern browsers (Chrome 110+, Firefox 115+, Safari 16+)
**Project Type**: Single-page web application
**Performance Goals**: p95 initial load ≤ 2 000 ms (4G); TTI ≤ 3 500 ms; Supabase read RPC
  p99 ≤ 500 ms; Lighthouse ≥ 90 *(unchanged)*
**Constraints**:
  - Iteration 2 net JS additions ≤ 5 KB gzipped (two presentational components, no libs)
  - Iteration 2 net DB additions: 1 column on `sections` (`framing JSONB`)
  - All quotes used must be ≤ 25 words and have a named, public-domain or fair-use
    attribution
**Scale/Scope**: < 500 total users; 5–30 concurrent participants per session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Code Quality**: WS-A is pure bug-fix; WS-B adds scripts; WS-C adds two small
  components (`SectionOpening`, `SectionClosing`) that follow existing component patterns.
  No unexplained complexity; nothing needed in Complexity Tracking.
- [x] **Test-First**: WS-A *is* the test discipline being restored — fixing the failing
  tests reinstates Red→Green→Refactor for all currently-broken interfaces. WS-C's two new
  components each have a paired `[RED]` test task before implementation.
- [x] **UX Consistency**: `SectionOpening` and `SectionClosing` are added to
  `src/components/section/` (new sub-folder of the shared component library). All styles
  use `tokens.css` custom properties. Typography scale unchanged. Used identically across
  all six sections.
- [x] **Performance**: Iteration 2 adds ≤ 5 KB gzipped. Two text-only components, no new
  runtime dependencies. Section framing is loaded with the existing section query — no
  extra network round-trip.
- [x] **IP Compliance**: WS-C touches content. **An IP review task (T-IP2-001) gates all
  framing content** — quotes must be verified for attribution and fair-use compliance,
  and Bijo's review confirms the framing language doesn't conflict with PSP™ pedagogy.
  Existing PSP™ attribution lines remain untouched.

*Post-Phase 1 re-check*: All gates remain passing. Complexity Tracking has no entries.

## Project Structure

### Documentation (this feature)

```text
specs/001-psp-course-platform/
├── plan.md                # This file (Iteration 2)
├── spec.md                # Feature specification (unchanged)
├── research.md            # Phase 0 — extended with Iteration 2 decisions (§§ 11–13)
├── data-model.md          # Phase 1 — extended with `framing JSONB` column
├── quickstart.md          # Phase 1 — extended with local Supabase workflow
├── framing-content.md     # NEW — authored framing for all 6 sections (delivered Phase 1)
├── contracts/
│   └── api-contracts.md   # Unchanged
├── bundle-report.md       # T086 output, unchanged
└── tasks.md               # Phase 2 output (extended with T087–T0NN by /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── ui/                  # Existing — Button, Badge, ProgressRing, Spinner, Toast
│   ├── exercise/            # Existing — Checkbox, Text, Table, Ranking, Info
│   ├── layout/              # Existing — PageShell, Sidebar, TopBar, AuthGuard, ErrorBoundary
│   └── section/             # NEW — SectionOpening, SectionClosing
├── pages/                   # Existing — auth/, admin/, facilitator/, course/
├── hooks/                   # Existing — useAuth, useProgress, useExerciseSave, useRealtimeSession
├── lib/                     # Existing — supabase.ts, constants.ts, devAuth.ts
├── context/                 # Existing — AuthContext.tsx
├── styles/                  # Existing — tokens.css, global.css
├── types/                   # Existing — database.ts (extended with framing field)
└── vitest.setup.ts          # MODIFIED — adds ResizeObserver, IntersectionObserver, matchMedia polyfills

db/
├── migrations/
│   ├── 001_profiles.sql                # Existing
│   ├── 002_sessions_enrollments.sql    # Existing
│   ├── 003_sections_exercises.sql      # Existing
│   ├── 004_responses_progress.sql      # Existing
│   ├── 005_rls_policies.sql            # Existing
│   ├── 006_rpc_functions.sql           # Existing
│   └── 007_section_framing.sql         # NEW — adds framing JSONB column to sections
└── seeds/
    ├── course-content.json             # MODIFIED — adds framing per section
    └── ip-review.md                    # Existing

supabase/
├── config.toml                         # MODIFIED — confirms ports + adds [auth.email] for local
├── migrations/                         # NEW — symlinks/copies of db/migrations/ (Supabase CLI convention)
└── seed.sql                            # NEW — creates default admin@local.dev user for local dev

scripts/
├── seed.ts                             # MODIFIED — accepts --local flag, reads supabase status
└── sync-migrations.sh                  # NEW — copies db/migrations/*.sql → supabase/migrations/<ts>_*.sql
```

**Structure Decision**: Existing single-SPA structure is preserved. New work lives in
clearly-scoped sub-trees: `src/components/section/`, `db/migrations/007_*`,
`supabase/migrations/`, `supabase/seed.sql`, and `scripts/sync-migrations.sh`. No reorganisation
of Iteration 1 code.

## Complexity Tracking

> **No violations to justify**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| *(none)* | | |

---

## Open Questions / NEEDS CLARIFICATION

These are recorded so they're answered explicitly before implementation begins.

- **Q1** — Should facilitator-facing prompts be hidden from participants?
  *Recommendation*: No. Always visible, styled subtly. Lowers barrier for self-paced learners
  and removes the need for role-conditional rendering.
- **Q2** — Should the per-section closing reflection save the participant's answer?
  *Recommendation*: No in v2. Prompt-only. Adds a "save reflection" exercise type later if
  Bijo asks for it.
- **Q3** — Quote licensing.
  *Recommendation*: Restrict to ≤25-word quotes from named, widely-attributed sources.
  Bijo signs off on the final list. Two of the brainstorm quotes (Disney, Allen) are
  business-book quotes — verify exact wording from primary source before commit.
- **Q4** — Local Supabase requires Docker. Is Docker an acceptable dev dependency?
  *Recommendation*: Yes. The Supabase CLI's `supabase start` is the standard local-dev path.
  Document Docker Desktop install in quickstart.md. Provide the existing `VITE_DEV_BYPASS`
  fallback for contributors who can't run Docker.
- **Q5** — When a section has no `framing` (NULL JSONB), what does the UI render?
  *Recommendation*: Render nothing — no opening/closing components. Graceful degradation,
  enables incremental rollout.

---

## Phase 0 — Research delta (additions to research.md §§ 11–13)

### § 11 — Local Supabase development workflow

**Decision**: Adopt Supabase CLI's local stack (`supabase start`) backed by Docker.

**Rationale**:
- Identical Postgres version, identical Auth/Realtime/Storage behaviour to production.
- Migrations applied via `supabase db reset` use the same SQL files we ship to production.
- Studio UI on `:54323` matches the production dashboard for ergonomic parity.
- Free, runs offline, deletes cleanly with `supabase stop`.

**Alternatives considered**:
- **Plain Postgres + manual auth shim**: rejected — diverges from production behaviour;
  RLS policies can't be exercised without Supabase Auth.
- **Continue using `VITE_DEV_BYPASS`-only**: rejected as primary path — bypass is fine for
  UI-only work but blocks any developer trying to test RLS, RPCs, or real persistence.
  Bypass remains as a fallback for non-Docker contributors.
- **Hosted dev project on supabase.com**: rejected — requires internet, requires personal
  cloud project per developer, slower iteration.

### § 12 — Section-framing data shape

**Decision**: Single nullable `framing JSONB` column on `sections`.

**Rationale**:
- Matches the existing `exercises.content_json` pattern — reviewers already understand it.
- Schema can evolve (add `audio_url`, `hero_image_url`, etc.) without migrations.
- Six rows × ~1 KB framing = 6 KB total payload. No indexing needed.

**Alternatives considered**:
- **Separate columns per field** (`opening_quote`, `opening_question`, …): rejected —
  requires a migration for every new framing field, and ~7 sparse columns is awkward.
- **Separate `section_framing` table**: rejected — 1:1 relationship adds a join with no
  benefit. Single-row-per-section content is what JSONB is for.

### § 13 — Test polyfill strategy for jsdom

**Decision**: Add `ResizeObserver`, `IntersectionObserver`, and `matchMedia` polyfills in
`src/vitest.setup.ts` using minimal in-file stubs (no extra packages).

**Rationale**:
- Recharts requires `ResizeObserver`. jsdom does not implement it.
- `IntersectionObserver` and `matchMedia` are common future failure points for any UI
  library that responds to viewport — pre-emptive coverage avoids whack-a-mole.
- A 10-line in-file stub avoids adding `resize-observer-polyfill` (3 KB) just for tests.

**Alternatives considered**:
- **`resize-observer-polyfill` package**: rejected — would land in production bundle
  unless carefully scoped; in-file stub keeps it test-only.
- **Mock Recharts module entirely in tests**: rejected — loses the chart-rendering
  surface area that Lighthouse and visual regression need.

---

## Phase 1 — Design & Contracts delta

### Data-model delta (applied to `data-model.md`)

Add to **Entity: `sections`**, after `icon_name`:

| Column | Type | Constraints | Description |
|---|---|---|---|
| `framing` | `jsonb` | NULL allowed | Per-section facilitator framing — see schema below |

**`framing` JSONB schema** (informal — validated at seed time, not at SQL time):

```jsonc
{
  "opening_quote": {
    "text": "string (≤25 words)",
    "attribution": "string (e.g., '— Viktor Frankl')"
  },
  "opening_question": "string",
  "facilitator_says": "string",
  "why_it_matters": "string",
  "closing_reflection": "string",
  "bridge_to_next": "string | null"   // null on the final section
}
```

No new RLS policy required: `sections` already has a public-read policy; the framing
travels with each section row.

### Contracts delta

No new RPC functions. No new endpoints. The existing `supabase.from('sections').select('*')`
query returns the new `framing` column automatically (after the migration is applied and
TypeScript types are regenerated — see T-WS-C-005).

### New components — UI contracts

**`<SectionOpening framing={section.framing} />`**

- Renders `<blockquote>` with the quote text + cite for attribution.
- Renders an `<aside role="note">` with the opening question (visually highlighted).
- Renders a "Facilitator says:" panel (subtle, italicised body text).
- Renders a "Why this matters" paragraph.
- If `framing` is `null`, returns `null` (graceful no-op).

**`<SectionClosing framing={section.framing} nextSectionSlug={...} />`**

- Renders the closing reflection question.
- Renders the bridge-to-next paragraph.
- Renders a "Continue to next section →" button (router navigation only, no progress side
  effect). On the final section, the button reads "Return to course home".
- If `framing` is `null`, renders only the navigation button.

Both components are pure-React, no state, no data fetching. Testable in isolation.

### Quickstart delta (applied to `quickstart.md`)

Replace **"3. Initialize the Database"** with a two-path section:

- **Path A (recommended): Local Supabase via Docker**
  1. Install Docker Desktop (link to docker.com).
  2. `npm i -g supabase` (or `brew install supabase/tap/supabase`).
  3. `npm run db:start` → `supabase start` (first run downloads images; later runs are
     instant).
  4. `npm run db:reset` → applies all `supabase/migrations/*.sql` and runs
     `supabase/seed.sql` (creates `admin@local.dev` / `admin123`).
  5. `npm run db:seed` → loads PSP course content.
  6. `npm run dev` → app at `http://localhost:5173`. Log in as `admin@local.dev`.
  7. (Optional) Open Supabase Studio at `http://localhost:54323` to inspect data.

- **Path B (UI-only, no Docker): Dev bypass**
  1. Set `VITE_DEV_BYPASS=true` in `.env.local`.
  2. `npm run dev`.
  3. Log in via the bypass card on the login page (`test` / `test123`,
     `admin` / `test123`, `facilitator` / `test123`).

### CLAUDE.md update

Update the trailing reference between `<!-- SPECKIT START -->` / `<!-- SPECKIT END -->` to
point at this iteration of the plan (path: `specs/001-psp-course-platform/plan.md`).

---

## Phase 2 — Tasks (will be generated by `/speckit-tasks`)

The next command (`/speckit-tasks`) will append T087–T0NN to `tasks.md` covering:

- **T-WS-A-* · Test repair** — ResizeObserver polyfill; vi.mock hoisting fixes for the two
  facilitator tests; SectionPage info-exercise content_json fix; CourseHistoryPage and
  useProgress chain-mock corrections; UsersPage activate-button selector tightening; final
  `npm test -- --run` green-bar verification.
- **T-WS-B-* · Local Supabase** — `scripts/sync-migrations.sh`; `supabase/seed.sql`;
  npm scripts (`db:start`, `db:reset`, `db:stop`); `scripts/seed.ts` `--local` flag;
  Docker-prerequisite documentation in quickstart.md; verification: log in as
  `admin@local.dev` end-to-end.
- **T-WS-C-* · Section framing** — IP review (T-IP2-001) of the framing-content.md draft;
  `db/migrations/007_section_framing.sql`; `framing-content.md` final authoring; update
  `db/seeds/course-content.json` with framing per section; update `scripts/seed.ts`;
  regenerate `src/types/database.ts`; **[RED]** test for `SectionOpening`; implement
  `SectionOpening`; **[RED]** test for `SectionClosing`; implement `SectionClosing`; wire
  both into `SectionPage.tsx`; visual regression check across all six sections.
- **T-WS-CLOSE-* · Closing tasks** — re-verify Constitution gates; mark T021/T022/T085
  complete (now achievable via local Supabase path); update `bundle-report.md` if bundle
  size shifts > 1 KB.

---

## Sequencing & dependencies

```text
WS-A (Test repair) ──┐
                     ├─→ WS-CLOSE (verify all green)
WS-B (Local Supabase)┤
                     │
WS-C (Section framing) ──── (depends on WS-B for end-to-end verification)
```

WS-A and WS-B are independent and can run in parallel (different files).
WS-C's content authoring (framing-content.md) is independent of code; the schema migration
and component work depend on WS-B's local stack to verify end-to-end without going to
supabase.com.

---

## Notes for the implementer

- **Do not move existing code**. Iteration 2 is additive — files in `src/` from Iteration 1
  are touched only when fixing a specific bug or wiring in the new section components.
- **Bijo must sign off on framing-content.md before any of it ships in production.**
  The IP review task (T-IP2-001) is a hard gate.
- **The `VITE_DEV_BYPASS` path stays available** for contributors who can't run Docker —
  do not remove it as part of WS-B.
- **Do not introduce new top-level dependencies.** Polyfills are in-file stubs; new
  components are pure React; framing content is data, not code.
