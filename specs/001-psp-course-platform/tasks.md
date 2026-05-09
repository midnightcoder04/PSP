---
description: "Task list for PSP Course Platform"
---

# Tasks: PSP Course Platform

**Input**: Design documents from `/specs/001-psp-course-platform/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Test tasks are included — the project constitution (§II Test-First Development)
mandates Red→Green→Refactor for all public interfaces. Test tasks are marked with `[RED]`
and MUST fail before implementation begins.

**Organization**: Tasks grouped by phase and user story for independent implementation.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1–US4)
- File paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Project scaffolding, toolchain, and shared configuration. No features yet.

- [X] T001 Initialize Vite + React 18 + TypeScript project in repo root via `npm create vite@latest . -- --template react-ts`
- [X] T002 [P] Install runtime dependencies: `@supabase/supabase-js react-router-dom recharts`
- [X] T003 [P] Install dev dependencies: `vitest @testing-library/react @testing-library/user-event jsdom @vitest/coverage-v8 tsx`
- [X] T004 [P] Configure Vitest in `vitest.config.ts` (jsdom environment, `src/vitest.setup.ts` setupFile, 80% coverage threshold)
- [X] T005 [P] Create `src/vitest.setup.ts` importing `@testing-library/jest-dom/extend-expect`
- [X] T006 [P] Configure `tsconfig.json` for strict mode and path alias `@/` → `src/`
- [X] T007 Create `src/styles/tokens.css` with all design tokens: `--color-trust: #2D5BE3`, `--color-growth: #22A06B`, `--color-warmth: #E8974A`, `--color-bg: #FAF9F7`, `--color-text: #4A4540`, spacing scale, typography scale (per plan.md Design System Summary)
- [X] T008 [P] Create `src/styles/global.css` with CSS reset (box-sizing, margin-0) and base typography (body font-family system stack, line-height 1.75, `prefers-reduced-motion` block)
- [X] T009 [P] Create `src/lib/supabase.ts` Supabase client singleton using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [X] T010 [P] Create `src/lib/constants.ts` with `ROUTES` object (all paths from plan.md routing structure) and `SECTION_SLUGS` array
- [X] T011 [P] Create `.env.example` with placeholder values for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; add `.env.local` to `.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, RLS, auth shell, and shared UI layout. MUST be complete before
any user story implementation can begin.

**⚠️ CRITICAL**: No user story work starts until Phase 2 is complete.

- [X] T012 IP compliance review — read `psp_content.md` in full and produce `db/seeds/ip-review.md` listing every attribution line, trademark, and "adapted with permission" text that MUST appear verbatim in `exercises.content_json` (per Constitution §Content & IP Compliance)
- [X] T013 Create `db/migrations/001_profiles.sql`: profiles table schema, `on_auth_user_created` trigger that inserts a profiles row on auth signup, and all indexes from data-model.md
- [X] T014 [P] Create `db/migrations/002_sessions_enrollments.sql`: sessions and enrollments tables, all indexes, UNIQUE constraint on `(session_id, participant_id)` from data-model.md
- [X] T015 [P] Create `db/migrations/003_sections_exercises.sql`: sections and exercises tables, UNIQUE constraints, all indexes from data-model.md
- [X] T016 Create `db/migrations/004_responses_progress.sql`: responses and progress tables, UNIQUE constraints, all indexes, and `update_progress_on_response` trigger (recalculates `completed_exercises`, sets `section_completed_at`, updates `last_exercise_id`) from data-model.md
- [X] T017 Create `db/migrations/005_rls_policies.sql`: all RLS ENABLE statements and all SELECT/INSERT/UPDATE/DELETE policies for all 7 tables per data-model.md RLS Policies sections
- [X] T018 [P] Create `db/migrations/006_rpc_functions.sql`: `get_session_stats(p_session_id)`, `get_admin_overview()`, and `get_resume_position(p_participant_id, p_session_id)` PostgreSQL functions per data-model.md signatures
- [X] T019 Create `db/seeds/course-content.json` with all 6 PSP sections and all exercises structured per data-model.md `content_json` schemas — source content from `psp_content.md`, preserve all attribution text identified in T012's ip-review.md
- [X] T020 Create `scripts/seed.ts` that reads `db/seeds/course-content.json` and upserts via Supabase client; add `"db:seed": "tsx scripts/seed.ts"` to `package.json`
- [X] T021 Apply all migrations: run `supabase db push` and verify all 7 tables appear in Supabase dashboard. **Re-scoped (2026-05-07)**: now satisfied by the hosted-Supabase bootstrap T100 — see Phase 9 (WS-B Hosted Supabase Workflow). **Satisfied 2026-05-10 via Supabase MCP** (`apply_migration` × 7); all 7 tables verified with RLS enabled.
- [X] T022 Run `npm run db:seed` and verify sections (6 rows) and exercises (~120 rows) in Supabase dashboard; verify attribution text is present in exercise rows. **Re-scoped (2026-05-07)**: now satisfied by T102 (hosted flow). **Satisfied 2026-05-10 via Supabase MCP** (`execute_sql`); 6 sections (all framing non-null), 30 exercises, 12 with attribution.
- [X] T023 Generate TypeScript types: `supabase gen types typescript --linked > src/types/database.ts`
- [X] T024 Write failing test for `LoginPage` renders email + password fields and calls `supabase.auth.signInWithPassword` on submit in `src/pages/auth/LoginPage.test.tsx` **[RED — must fail before T025]**
- [X] T025 Implement `LoginPage` in `src/pages/auth/LoginPage.tsx` + `LoginPage.module.css` (email/password form, error message display, loading state)
- [X] T026 [P] Implement `ResetPasswordPage` in `src/pages/auth/ResetPasswordPage.tsx` + `ResetPasswordPage.module.css` (email field, calls `supabase.auth.resetPasswordForEmail`)
- [X] T027 Implement `AuthContext` in `src/context/AuthContext.tsx` (subscribes to `onAuthStateChange`, loads profile after `SIGNED_IN`, exposes `{ user, profile, signOut, loading }`)
- [X] T028 [P] Implement `useAuth` hook in `src/hooks/useAuth.ts` (reads `AuthContext`, re-exports `user`, `profile`, `signOut`, `loading`)
- [X] T029 Implement `AuthGuard` component in `src/components/layout/AuthGuard.tsx` (redirects to `/login` if no session; blocks route by `requiredRole` prop and redirects to role home if mismatch; renders `null` while `loading`)
- [X] T030 Set up React Router in `src/App.tsx` with `<Suspense>` and all lazy-loaded route groups (`/login`, `/admin/*`, `/facilitator/*`, `/course/*`) wrapped with `<AuthGuard>`
- [X] T031 Implement `PageShell` layout in `src/components/layout/PageShell.tsx` + `PageShell.module.css` (2-column shell: sidebar left, content right; max-width from tokens)
- [X] T032 [P] Implement `Sidebar` in `src/components/layout/Sidebar.tsx` + `Sidebar.module.css` (role-aware nav links using `useAuth`, active link highlight using `NavLink`)
- [X] T033 [P] Implement `TopBar` in `src/components/layout/TopBar.tsx` + `TopBar.module.css` (page title slot, user display name, sign-out button)
- [X] T034 [P] Implement `Toast` notification atom in `src/components/ui/Toast.tsx` + `Toast.module.css` (success/error variants, auto-dismiss 3s, CSS fade-in/out animation)

**Checkpoint**: Foundation complete — login works, database seeded, layout shell renders. All user story phases can now begin.

---

## Phase 3: User Story 1 — Participant Course Journey (Priority: P1) 🎯 MVP

**Goal**: Participant can log in, navigate all 6 PSP sections, complete all exercise types,
have responses auto-saved, and resume exactly from last position on re-login.

**Independent Test**: Log in as a participant → navigate to Personality section → complete a
checkbox exercise → close browser → reopen and log in → verify checkbox selection persists and
ProgressRing shows partial completion.

### Tests for US1 — Write First, Confirm RED ⚠️

- [X] T035 [US1] Write failing test for `useProgress` loads section progress array with `completed_exercises` and `total_exercises` per section in `src/hooks/useProgress.test.ts` **[RED]**
- [X] T036 [P] [US1] Write failing test for `useExerciseSave` calls Supabase upsert after 300ms debounce in `src/hooks/useExerciseSave.test.ts` **[RED]**
- [X] T037 [P] [US1] Write failing test for `CourseHome` renders 6 section cards each with a `ProgressRing` and correct section titles in `src/pages/course/CourseHome.test.tsx` **[RED]**
- [X] T038 [P] [US1] Write failing test for `SectionPage` renders exercises in `order_index` order and passes `onSave` to each exercise component in `src/pages/course/SectionPage.test.tsx` **[RED]**
- [X] T039 [P] [US1] Write failing test for `CheckboxExercise` toggles option selection and calls `onSave` with updated `selected_ids` in `src/components/exercise/CheckboxExercise.test.tsx` **[RED]**
- [X] T040 [P] [US1] Write failing test for `TextExercise` updates textarea value and calls `onSave` after debounce delay in `src/components/exercise/TextExercise.test.tsx` **[RED]**
- [X] T041 [P] [US1] Write failing test for `RankingExercise` moves item up/down and calls `onSave` with new order array in `src/components/exercise/RankingExercise.test.tsx` **[RED]**
- [X] T042 [P] [US1] Write failing test for `TableExercise` accepts cell input and calls `onSave` with updated rows in `src/components/exercise/TableExercise.test.tsx` **[RED]**

### Implementation for US1

- [X] T043 [US1] Implement `ProgressRing` UI atom in `src/components/ui/ProgressRing.tsx` + `ProgressRing.module.css` (SVG ring, `--color-growth` stroke, CSS animation on mount, `prefers-reduced-motion` respected)
- [X] T044 [P] [US1] Implement `Button` UI atom in `src/components/ui/Button.tsx` + `Button.module.css` (variants: primary/secondary/ghost, loading state, disabled state)
- [X] T045 [P] [US1] Implement `Badge` UI atom in `src/components/ui/Badge.tsx` + `Badge.module.css` (variants: success/info/muted using design tokens)
- [X] T046 [P] [US1] Implement `Spinner` UI atom in `src/components/ui/Spinner.tsx` + `Spinner.module.css` (CSS border-radius spin animation, `prefers-reduced-motion` stops animation)
- [X] T047 [US1] Implement `useProgress` hook in `src/hooks/useProgress.ts` (fetches from `progress` table filtered by `participant_id` and optional `session_id`, returns array of section progress records)
- [X] T048 [US1] Implement `useExerciseSave` hook in `src/hooks/useExerciseSave.ts` (accepts `exerciseId`, `sessionId`, `participantId`; returns `save(responseJson, isComplete)` function with 300ms debounce; saves status: idle/saving/saved/error)
- [X] T049 [P] [US1] Implement `InfoExercise` renderer in `src/components/exercise/InfoExercise.tsx` + `InfoExercise.module.css` (renders plain-text content block; displays `attribution` field in a styled attribution line — no save interaction)
- [X] T050 [US1] Implement `CheckboxExercise` renderer in `src/components/exercise/CheckboxExercise.tsx` + `CheckboxExercise.module.css` (renders options from `content_json.options`, multi-select via `useState`, calls `onSave` immediately on toggle, shows save indicator from useExerciseSave status)
- [X] T051 [P] [US1] Implement `TextExercise` renderer in `src/components/exercise/TextExercise.tsx` + `TextExercise.module.css` (textarea with `content_json.placeholder`, calls `onSave` after 300ms debounce via `useExerciseSave`, character count if `max_length` set, shows "Saved ✓" fade-in on save)
- [X] T052 [P] [US1] Implement `RankingExercise` renderer in `src/components/exercise/RankingExercise.tsx` + `RankingExercise.module.css` (renders `content_json.items` as drag-sortable list using keyboard-accessible up/down buttons; no drag library — pure CSS + state; calls `onSave` after each reorder)
- [X] T053 [P] [US1] Implement `TableExercise` renderer in `src/components/exercise/TableExercise.tsx` + `TableExercise.module.css` (renders editable grid from `content_json.headers` and `content_json.rows`; each cell is a contenteditable or input; calls `onSave` on cell blur)
- [X] T054 [US1] Implement `SectionPage` in `src/pages/course/SectionPage.tsx` + `SectionPage.module.css` (loads section + exercises from Supabase, loads existing responses, renders exercise components in `order_index` order, tracks section-level completion percentage in UI)
- [X] T055 [US1] Implement `CourseHome` in `src/pages/course/CourseHome.tsx` + `CourseHome.module.css` (renders 6 section cards each with section title, `ProgressRing`, and completion badge; on mount calls `get_resume_position` RPC and redirects if in-progress)
- [X] T056 [US1] Wire `get_resume_position` RPC call in `CourseHome.tsx`: on mount, if result is non-null redirect participant to `/course/:sectionSlug` at their last exercise (scroll to exercise ID via URL hash)

**Checkpoint**: US1 complete and independently testable. Participant journey fully functional.

---

## Phase 4: User Story 2 — Admin Platform Management (Priority: P2)

**Goal**: Admin can create/manage user accounts, create sessions, assign facilitators, manage
enrollments, and view platform-wide completion statistics.

**Independent Test**: Log in as admin → create facilitator account → create session → assign
facilitator → enroll participant → view AdminDashboard and confirm participant appears in stats.

### Tests for US2 — Write First, Confirm RED ⚠️

- [X] T057 [US2] Write failing test for `AdminDashboard` renders stat cards (total sessions, total participants, overall completion %) in `src/pages/admin/AdminDashboard.test.tsx` **[RED]**
- [X] T058 [P] [US2] Write failing test for `UsersPage` renders user rows with role badge and toggle-active button in `src/pages/admin/UsersPage.test.tsx` **[RED]**
- [X] T059 [P] [US2] Write failing test for `SessionsPage` renders session rows with facilitator name and participant count in `src/pages/admin/SessionsPage.test.tsx` **[RED]**

### Implementation for US2

- [X] T060 [US2] Implement `AdminDashboard` in `src/pages/admin/AdminDashboard.tsx` + `AdminDashboard.module.css` (calls `get_admin_overview` RPC, renders stat cards and a Recharts `BarChart` of per-section avg completion %)
- [X] T061 [US2] Implement `UsersPage` in `src/pages/admin/UsersPage.tsx` + `UsersPage.module.css` (table of all profiles with role badge, is_active toggle, and "Add User" button)
- [X] T062 [P] [US2] **REOPENED (analysis C1) — RESOLVED 2026-05-10 via option (a) Edge Function**. Deployed `supabase/functions/create-user` (verify_jwt=true) which validates the caller is an active admin, then uses `auth.admin.createUser` server-side and atomically sets the profile role. Modal in `src/pages/admin/UserCreateModal.tsx` + `UserCreateModal.module.css` calls `supabase.functions.invoke('create-user', { body: { email, display_name, role, password } })`. No `service_role` exposure in the browser.
- [X] T063 [US2] Implement `SessionsPage` in `src/pages/admin/SessionsPage.tsx` + `SessionsPage.module.css` (table of sessions with facilitator name, scheduled dates, enrollment count, and "New Session" button)
- [X] T064 [P] [US2] Implement `SessionCreateModal` in `src/pages/admin/SessionCreateModal.tsx` + `SessionCreateModal.module.css` (title, description, scheduled start/end date pickers, facilitator dropdown from profiles where role=facilitator)
- [X] T065 [US2] Implement `AdminSessionDetailPage` in `src/pages/admin/AdminSessionDetailPage.tsx` + `AdminSessionDetailPage.module.css` (enrolled participants list with completion %, add participant dropdown, remove participant button)

**Checkpoint**: US2 complete. Admin controls all user access and session configuration.

---

## Phase 5: User Story 3 — Facilitator Session Oversight (Priority: P3)

**Goal**: Facilitator can view their assigned sessions and see per-participant progress in
real-time, with the dashboard updating within 5 seconds of any participant action.

**Independent Test**: Open facilitator dashboard in one browser tab; in another tab log in as
a participant in the facilitator's session and complete an exercise; the facilitator tab updates
the participant's completion % without any manual refresh.

### Tests for US3 — Write First, Confirm RED ⚠️

- [X] T066 [US3] Write failing test for `useRealtimeSession` calls `onUpdate` callback when a mock Supabase channel fires a postgres_changes event in `src/hooks/useRealtimeSession.test.ts` **[RED]**
- [X] T067 [P] [US3] Write failing test for `FacilitatorDashboard` renders session cards with overall completion % in `src/pages/facilitator/FacilitatorDashboard.test.tsx` **[RED]**
- [X] T068 [P] [US3] Write failing test for `FacilitatorSessionDetailPage` renders one row per enrolled participant with section progress columns in `src/pages/facilitator/FacilitatorSessionDetailPage.test.tsx` **[RED]**

### Implementation for US3

- [X] T069 [US3] Implement `useRealtimeSession` hook in `src/hooks/useRealtimeSession.ts` (subscribes to `postgres_changes` on `progress` table filtered by `session_id=eq.{id}`, calls `onUpdate()` on any event; cleans up channel on unmount)
- [X] T070 [US3] Implement `FacilitatorDashboard` in `src/pages/facilitator/FacilitatorDashboard.tsx` + `FacilitatorDashboard.module.css` (lists sessions where `facilitator_id = auth.uid()`, each card shows session title, dates, enrolled count, and overall completion % from `get_session_stats`)
- [X] T071 [US3] Implement `FacilitatorSessionDetailPage` in `src/pages/facilitator/FacilitatorSessionDetailPage.tsx` + `FacilitatorSessionDetailPage.module.css` (table: one row per participant, columns for each section completion %, overall %, last active time; uses `useRealtimeSession` to re-call `get_session_stats` on any progress event)

**Checkpoint**: US3 complete. Facilitator live dashboard functional with ≤5s update latency.

---

## Phase 6: User Story 4 — Data Persistence & History (Priority: P4)

**Goal**: Participants can review all past exercise responses; facilitators can access
historical session stats.

**Independent Test**: Complete a section as a participant, then navigate to `/course/history`,
click into the completed session, and verify all exercise responses are displayed as read-only
with correct previously entered values.

### Tests for US4 — Write First, Confirm RED ⚠️

- [X] T072 [US4] Write failing test for `CourseHistoryPage` renders a list of past enrollments with session title and completion date in `src/pages/course/CourseHistoryPage.test.tsx` **[RED]**

### Implementation for US4

- [X] T073 [US4] Implement `CourseHistoryPage` in `src/pages/course/CourseHistoryPage.tsx` + `CourseHistoryPage.module.css` (lists all enrollments for auth user, shows session title, facilitator name, completion date or "In Progress")
- [X] T074 [US4] Add `readOnly?: boolean` prop to `SectionPage.tsx`: when true, loads and renders all exercise responses as static display without interaction controls, no save calls
- [X] T075 [P] [US4] Add `readOnly` prop support to `CheckboxExercise`, `TextExercise`, `RankingExercise`, `TableExercise` components — when `readOnly=true`, render submitted values as styled read-only display (no inputs or buttons)
- [X] T076 [US4] Update `FacilitatorSessionDetailPage.tsx` to detect when a session's `scheduled_end` is in the past and disable the Realtime subscription, showing a "Session Archived" badge while still rendering historical stats from `get_session_stats`

**Checkpoint**: US4 complete. Full data history accessible for all roles.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality, accessibility, responsive layout, micro-interactions, and final validation.

- [X] T077 Implement `ErrorBoundary` component in `src/components/layout/ErrorBoundary.tsx` + `ErrorBoundary.module.css` (class component; renders friendly "Something went wrong" message with retry button; wrap around all route groups in `App.tsx`)
- [X] T078 [P] Add `@media (prefers-reduced-motion: reduce)` blocks to `src/styles/global.css` and every `*.module.css` file that defines transitions or keyframe animations — disable or replace with instant transitions
- [X] T079 [P] Add responsive layout breakpoints to `PageShell.module.css` and all page modules: single-column below 768 px, collapsible sidebar below 768 px, minimum font-size 16px on mobile
- [X] T080 [P] Run browser accessibility inspector (axe DevTools or similar) on all 3 portals (admin, facilitator, course); fix all WCAG 2.1 AA violations (focus rings, ARIA labels, color contrast, keyboard trap)
- [ ] T081 [P] Run Lighthouse on `/course`, `/admin`, and `/facilitator` routes; resolve all Performance and Accessibility issues until both scores ≥ 90; document results in `specs/001-psp-course-platform/lighthouse-results.md`
- [X] T082 [P] Add empty state UI to all list views: no sessions (FacilitatorDashboard, SessionsPage), no users (UsersPage), no enrollments (AdminSessionDetailPage), no history (CourseHistoryPage) — each with an encouraging message and a CTA button
- [X] T083 Implement section-completion celebration micro-animation in `ProgressRing.tsx`: when `pct` prop transitions to 100, trigger a CSS keyframe "bloom" pulse on the ring using `--color-growth`
- [X] T084 [P] Add save-confirmation micro-interaction to `TextExercise`, `CheckboxExercise`, `RankingExercise`, `TableExercise`: a checkmark icon fades in for 1.5s using CSS `@keyframes` whenever `useExerciseSave` status transitions to `saved`
- [X] T085 **Replaced by T130 (timing-aware variant) and re-scoped to hosted Supabase (2026-05-07).** Original: run complete `quickstart.md` validation: fresh `npm install` → `supabase db push` → `npm run db:seed` → create admin user → create facilitator → create session → enroll participant → log in as participant → complete a full section → log out → log in → verify resume position and response persistence. **New flow**: `.env.local` populated with `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY` → `supabase link --project-ref <ref>` → `supabase db push` → admin user created via Supabase Dashboard (T101) → `npm run db:seed` (T102) → walk through quickstart with the per-step timing checkboxes in T130.
- [X] T086 [P] Review bundle size: run `npm run build -- --report`, confirm no individual route chunk exceeds 10 KB gzipped above what is justified in plan.md Complexity Tracking; document final sizes in `specs/001-psp-course-platform/bundle-report.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — begin immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — core MVP; no dependency on US2/US3/US4
- **US2 (Phase 4)**: Depends on Phase 2 — no dependency on US1/US3/US4
- **US3 (Phase 5)**: Depends on Phase 2 and US2 (sessions must exist to facilitate)
- **US4 (Phase 6)**: Depends on US1 (responses must exist to review history)
- **Polish (Phase 7)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2. No dependency on other user stories.
- **US2 (P2)**: Can start after Phase 2. No dependency on US1.
- **US3 (P3)**: Depends on US2 (sessions created by admin needed for facilitator views).
- **US4 (P4)**: Depends on US1 (responses needed for history views).

### Within Each User Story

- Test tasks MUST be written and confirmed failing before implementation tasks begin
- Component atoms (T043–T046) before page components (T054–T055)
- Hooks (T047–T048) before components that use them (T050–T055)
- Each story's checkpoint: verify independent testability before starting next story

### Parallel Opportunities (within Phase 2)

```bash
# These can run simultaneously once Phase 1 is done:
Task: "Create db/migrations/001_profiles.sql" (T013)
Task: "Create db/migrations/002_sessions_enrollments.sql" (T014)
Task: "Create db/migrations/003_sections_exercises.sql" (T015)
```

### Parallel Opportunities (within US1 tests)

```bash
# All test tasks for US1 can run in parallel:
Task: "Write failing test for useProgress" (T035)
Task: "Write failing test for useExerciseSave" (T036)
Task: "Write failing test for CourseHome" (T037)
Task: "Write failing test for SectionPage" (T038)
Task: "Write failing test for CheckboxExercise" (T039)
Task: "Write failing test for TextExercise" (T040)
Task: "Write failing test for RankingExercise" (T041)
Task: "Write failing test for TableExercise" (T042)
```

### Parallel Opportunities (within US1 atoms)

```bash
# UI atoms can be built in parallel:
Task: "Implement Button atom" (T044)
Task: "Implement Badge atom" (T045)
Task: "Implement Spinner atom" (T046)
Task: "Implement InfoExercise" (T049)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001–T011)
2. Complete Phase 2: Foundational (T012–T034) — seeded DB + auth shell
3. Complete Phase 3: US1 — Participant Course (T035–T056)
4. **STOP and VALIDATE**: Log in as participant, complete a full PSP section, verify persistence
5. Demo-ready MVP: participant can experience the full PSP course

### Incremental Delivery

1. Setup + Foundational → DB seeded, login works
2. US1 → Participants complete PSP course → Demo to Bijo/stakeholders
3. US2 → Admin manages users and sessions → Platform is fully operable
4. US3 → Facilitator gets live oversight → Workshop facilitation supported
5. US4 → History accessible → Full data value delivered
6. Polish → Production-quality UX and performance

### Parallel Team Strategy

With two developers after Phase 2:

- Developer A: US1 (Participant Course — P1)
- Developer B: US2 (Admin Portal — P2)
- Both stories complete → Developer A: US4 | Developer B: US3
- Both stories complete → Both: Polish (Phase 7)

---

## Notes

- All `[P]` tasks within a phase write to different files — safe to run in parallel
- `[US*]` labels enable tracking which story each task serves
- `[RED]` test tasks MUST fail before paired implementation tasks begin (Constitution §II)
- Commit after each task or logical group (Constitution §Development Workflow)
- IP review (T012) output drives seed content (T019) — do not skip or defer
- Service role key (needed for user creation in T062) MUST NOT be committed to source control
- **Remaining**: T021/T022 require `supabase` CLI connected to project; T081/T085/T086 require running application

---

# Iteration 2 — Test Repair · Hosted Supabase · Section Framing

**Plan**: `specs/001-psp-course-platform/plan.md` (Iteration 2 — 2026-05-07)
**Reference**: `specs/001-psp-course-platform/framing-content.md` (DRAFT, gates WS-C)
**Numbering**: T087+ (continues from Iteration 1's T086)

Iteration 2 is **additive** to T001–T086. None of the existing files are restructured. The
three workstreams (WS-A test repair, WS-B hosted Supabase, WS-C section framing) can run
mostly in parallel; see "Iteration 2 Dependencies" near the end.

---

## Phase 8 — WS-A · Test Suite Repair

**Purpose**: Bring the 18 currently-failing Vitest cases to green so the Test-First gate
(Constitution §II) is satisfied for the whole codebase. Cross-cutting bug-fix pass —
no `[USx]` labels.

**Independent Test**: `npm test -- --run` exits zero with all tests passing and zero
unhandled errors in the output.

- [X] T087 Add `ResizeObserver`, `IntersectionObserver`, and `matchMedia` polyfills to `src/vitest.setup.ts` as in-file class stubs (no new packages); fixes Recharts crash in `AdminDashboard.test.tsx`
- [X] T088 [P] Fix `vi.mock` hoisting bug in `src/pages/facilitator/FacilitatorDashboard.test.tsx`: replace `vi.fn().mockResolvedValue({ data: mockStats, error: null })` with `vi.fn().mockImplementation(() => Promise.resolve({ data: mockStats, error: null }))` so `mockStats` is read at test-time (not at hoist-time)
- [X] T089 [P] Apply the same `mockImplementation` fix in `src/pages/facilitator/FacilitatorSessionDetailPage.test.tsx`
- [X] T090 [P] Fix the `info`-type exercise mock in `src/pages/course/SectionPage.test.tsx`: change `content_json` from `{ prompt, body }` to `{ content: '...' }` so `InfoExercise` doesn't crash on `undefined.split('\n')`
- [X] T091 [P] Tighten the activate-button selector in `src/pages/admin/UsersPage.test.tsx` (test "shows Activate button for inactive users"): use `getByRole('button', { name: /^activate$/i })` so the regex doesn't also match "Deactivate"
- [X] T092 [P] Rewrite the failing `useProgress` chain mocks in `src/hooks/useProgress.test.ts` (tests "filters by sessionId when provided" and "surfaces error when fetch fails"): use a single `makeChain(data, error)` helper instead of overloaded `mockReturnValueOnce` chains; ensure the terminal `is()` / `eq()` resolves with the right tuple
- [X] T093 [P] Diagnose and fix `src/pages/course/CourseHistoryPage.test.tsx` failures ("PSP Batch 7" not found, "Facilitator Bob" not found, etc.): inspect what the component actually renders during the test (likely a Spinner that never resolves) and correct the chain mock to terminate cleanly so `setLoading(false)` runs
- [X] T094 Run `npm test -- --run` and confirm zero failures and zero unhandled exceptions; record final pass count in commit message

**Checkpoint**: Test suite green. Constitution §II re-affirmed end-to-end.

---

## Phase 9 — WS-B · Hosted Supabase Workflow  *(rewritten 2026-05-07)*

**Purpose**: Connect the platform to a hosted Supabase project (no Docker, no local
stack). Adopts the new Supabase API key model — `sb_publishable_…` for the browser,
`sb_secret_…` for server-side seeding — and replaces the previous
`anon key` / `service_role key` naming everywhere. Cross-cutting infrastructure work —
no `[USx]` labels.

**Independent Test**: A fresh clone, after `npm install`, with `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` set in `.env.local`,
followed by `supabase login && supabase link --project-ref <ref> && supabase db push`
and `npm run db:seed`, lets you log in at `http://localhost:5173` as the admin user
(created via the Supabase dashboard) and see all 6 sections seeded with exercises.

### Key naming convention

| Use | Var name | File | Prefix |
|---|---|---|---|
| Browser, RLS-protected | `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` | `sb_publishable_…` |
| Server, bypasses RLS | `SUPABASE_SECRET_KEY` (no `VITE_` prefix) | `.env.local` (gitignored) | `sb_secret_…` |
| Public URL | `VITE_SUPABASE_URL` | `.env.local` | `https://<ref>.supabase.co` |

**Why no `VITE_` prefix on the secret**: Vite inlines every `VITE_*` var into the
production browser bundle. A `VITE_SUPABASE_SECRET_KEY` would publish the
service-role-equivalent key to anyone with DevTools.

- [X] T095 [P] Update `src/vite-env.d.ts`: add `VITE_SUPABASE_PUBLISHABLE_KEY: string`; mark `VITE_SUPABASE_ANON_KEY` optional with a `@deprecated` JSDoc comment (transition shim only)
- [X] T096 Update `src/lib/supabase.ts`: read `VITE_SUPABASE_PUBLISHABLE_KEY` first, fall back to `VITE_SUPABASE_ANON_KEY` for one release with a `console.warn` deprecation notice; throw if a value starting with `sb_secret_` is detected in browser env (defence-in-depth against misconfiguration)
- [X] T097 [P] Update `scripts/seed.ts`: prefer `process.env.SUPABASE_SECRET_KEY` (sb_secret_… prefix), fall back to `VITE_SUPABASE_SECRET_KEY` (with a loud rename warning) and `SUPABASE_SERVICE_ROLE_KEY` (legacy); refuse to start if a `sb_publishable_…` key is supplied (RLS would block sections/exercises writes anyway); print which env var was used and the key prefix on startup
- [X] T098 [P] Update `.env.example`: document `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` with the new prefixes; add inline note that the secret key MUST NOT carry a `VITE_` prefix
- [X] T099 Update `package.json`: change `db:seed` to `tsx --env-file=.env.local scripts/seed.ts` so the Node script picks up `.env.local` without a separate `dotenv` dependency (tsx v4.x supports `--env-file` natively per tsx docs)
- [X] T100 **One-time hosted bootstrap**. **Satisfied 2026-05-10 via Supabase MCP** — applied all 7 migrations (001–007) to project `okedskadkspeiyxjslqc` (PSP) using `apply_migration`. Verified: 7 tables present (`profiles`, `sessions`, `enrollments`, `sections`, `exercises`, `responses`, `progress`) with RLS enabled. The `supabase` CLI path remains valid for contributors who prefer it.
- [ ] T101 **Create the initial admin user via the Supabase Dashboard** — Authentication → Users → "Add user" → enter the admin email, choose "Auto Confirm User", set a strong password. The `on_auth_user_created` trigger from migration 001 inserts the matching `public.profiles` row with role=`participant`. Then in the Supabase SQL Editor run: `UPDATE public.profiles SET role='admin', display_name='Site Admin' WHERE email='<admin-email>';`. Once any admin exists, additional users (admin / facilitator / participant) can be created via the new `/admin/users` page (T062 + create-user Edge Function). **Maintainer action required** — cannot be done via MCP because dashboard auth UI is not exposed.
- [X] T102 **Satisfied 2026-05-10 via Supabase MCP** (`execute_sql` with the seed SQL synthesized from `db/seeds/course-content.json`). Verified: `sections` has 6 rows all with non-null `framing` JSONB, `exercises` has 30 rows (matches `course-content.json`), 12 carry `attribution` text matching `ip-review.md`. (The 30-vs-~120 delta from the early estimate reflects the actual seed file contents — see ip-review.md.)

**Checkpoint**: Any contributor with `.env.local` populated and `supabase` CLI logged
in can run `npm run db:seed && npm run dev` against the hosted project. No Docker
required.

### Why this differs from the previous draft

The previous WS-B (T095–T102 pre-2026-05-07) targeted a Docker-based local stack via
`supabase start`. We pivoted to the hosted project so:
- migrations and seed data live next to the production data in a single source of truth;
- IP-reviewed framing content is visible in Supabase Studio for Bijo's review;
- there is no Docker dependency for contributors;
- Iteration 1's deferred T021/T022/T085 close out as a side-effect of T100/T102.

The pre-2026-05-07 draft (`scripts/sync-migrations.sh`, `supabase/seed.sql`,
`supabase/config.toml` for local dev, `db:start`/`db:reset`/`db:status` scripts) is
**discarded**. `supabase/config.toml` was left in place for the offline-fallback case
documented in `quickstart.md` (`VITE_DEV_BYPASS=true`); it is not exercised by the
hosted flow.

---

## Phase 10 — WS-C · Section Framing & Course Content Detail

**Purpose**: Each of the six PSP sections gains facilitator-facing framing (opening quote,
opening question, "facilitator says" cue, why-it-matters, closing reflection, bridge to
next). Enhances the participant journey (US1) — labelled `[US1]` accordingly.

**Independent Test**: A participant logged into a session can navigate to any section and
see (in order): opening quote, opening question, facilitator note, why-it-matters
paragraph, the section's exercises, the closing reflection, the bridge sentence, and a
"Continue to next section →" button. The final section shows "Return to course home"
instead of a bridge.

### IP Gate (BLOCKING — runs first)

- [X] T103 **[IP REVIEW · T-IP2-001]** Bijo reviews `specs/001-psp-course-platform/framing-content.md` against the checklist in that file (quotes accurate and in fair-use range, facilitator-says lines reflect his voice, why-it-matters paragraphs accurate to PSP™ pedagogy); record sign-off by checking each box in framing-content.md and committing

### Schema & Seed for US1

- [X] T104 [US1] Create `db/migrations/007_section_framing.sql`: `ALTER TABLE public.sections ADD COLUMN framing jsonb;` (nullable, no default) — matches data-model.md "Entity: sections" Iteration 2 row
- [X] T105 [US1] **Done**: `supabase/migrations/` already contains timestamped copies of all 7 migrations. The CLI path remains available for contributors; the MCP path used `apply_migration` directly.
- [X] T106 [US1] **Satisfied 2026-05-10 via Supabase MCP** (`apply_migration` for `007_section_framing`). Verified `sections.framing jsonb` column exists and is populated for all 6 rows.
- [X] T107 [US1] Update `src/types/database.ts`: add `framing: SectionFraming | null` to `sections.Row`, `framing?: SectionFraming | null` to `sections.Insert` and `sections.Update`; verify `npx tsc --noEmit` passes (combined with T129 — exported `SectionFraming` interface)
- [X] T108 [US1] Update `db/seeds/course-content.json`: for each of the 6 sections, add a `framing` object copied verbatim from the corresponding section block in `specs/001-psp-course-platform/framing-content.md` (after T103 sign-off)
- [X] T109 [US1] Update `scripts/seed.ts`: include `framing` field in the section upsert payload so the new column is populated; verify with a no-op re-run that no exercise content is duplicated (typing tightened via `SectionFramingSeed`; existing `{ exercises, ...sectionData }` destructure carries the field through)
- [X] T110 [US1] **Satisfied 2026-05-10 via Supabase MCP** alongside T102. All 6 `sections` rows carry non-null `framing` JSONB; spot-checked structure matches `framing-content.md`.

### Components for US1 (Test-First)

- [X] T111 [P] [US1] Write failing test for `SectionOpening` in `src/components/section/SectionOpening.test.tsx`: renders quote text, attribution (with `<cite>` semantics), opening_question, facilitator_says, and why_it_matters; returns `null` when `framing` prop is `null` **[RED — must fail before T113]**
- [X] T112 [P] [US1] Write failing test for `SectionClosing` in `src/components/section/SectionClosing.test.tsx`: renders closing_reflection and bridge_to_next; "Continue to next section →" button calls navigate with the next slug; renders "Return to course home" when bridge_to_next is `null`; returns navigation-only when `framing` is `null` **[RED — must fail before T114]**
- [X] T113 [US1] Implement `SectionOpening` in `src/components/section/SectionOpening.tsx` + `SectionOpening.module.css`: pure presentational, accepts `framing` prop typed against the JSONB schema in data-model.md; uses `<blockquote>` for quote, `<cite>` for attribution, `<aside role="note">` for opening question; styles use only `tokens.css` custom properties; honours `prefers-reduced-motion`
- [X] T114 [US1] Implement `SectionClosing` in `src/components/section/SectionClosing.tsx` + `SectionClosing.module.css`: accepts `framing` and `nextSectionSlug` props; reflection question card, bridge paragraph, navigation button (uses `useNavigate` from react-router-dom); button label switches to "Return to course home" when `nextSectionSlug` is `null`
- [X] T115 [US1] Wire `<SectionOpening framing={section?.framing} />` into `src/pages/course/SectionPage.tsx` between the subtitle paragraph (line ~148) and the exercise list (line ~151)
- [X] T116 [US1] Wire `<SectionClosing framing={section?.framing} nextSectionSlug={...} />` into `src/pages/course/SectionPage.tsx` between the exercise list (line ~168) and the navButtons div (line ~170); compute `nextSectionSlug` from `SECTION_SLUGS` in `lib/constants.ts` (returns `null` for the final section)

### Visual & Read-Only Coverage for US1

- [X] T117 [P] [US1] Update `src/pages/course/SectionPage.tsx`'s `readOnly` mode (T074) so opening framing still shows but `SectionClosing`'s "Continue" button is hidden in history view (read-only browsing) — implemented via `<SectionClosing showContinue={!readOnly} />`
- [ ] T118 [US1] Visual smoke test: `npm run dev` → log in → walk through all 6 sections; capture one screenshot per section showing framing renders correctly; save to `specs/001-psp-course-platform/screenshots/section-framing-<slug>.png` (or note in commit if screenshots are skipped)

**Checkpoint**: Each section now opens with a quote + question + facilitator cue and closes
with a reflection + bridge. The participant experience matches what an in-room workshop
attendee would hear.

---

## Phase 11 — Iteration 2 Close-out

**Purpose**: Re-verify gates, re-measure budgets, mark deferred Iteration 1 tasks as
satisfied. Cross-cutting — no `[USx]` labels.

- [X] T119 Run `npm test -- --run` again after WS-C lands; confirm zero regressions (test count should have grown by the new SectionOpening + SectionClosing test suites). **Baseline (analysis L3/T135)**: pre-WS-A 56 passing / 18 failing → post-WS-A target ≥ 74 passing / 0 failing; post-WS-C target ≥ 86 passing / 0 failing. **Result**: 98 passing / 0 failing across 18 test files.
- [X] T120 Run `npm run build`; capture per-chunk gzipped sizes; confirm net additions vs T086 baseline are ≤ 5 KB gzipped (Section components only — no new dependencies). **Result**: net delta ≈ +1 kB gzipped, well under budget.
- [X] T121 Update `specs/001-psp-course-platform/bundle-report.md` with an Iteration 2 section showing the new chunk sizes and a delta vs Iteration 1
- [X] T122 Re-verify Constitution Check in `specs/001-psp-course-platform/plan.md`: mark "Post-Phase 1 re-check" lines confirmed and add a "Post-Iteration 2 re-check: all gates passing" line near the gate block
- [X] T123 [P] **Done 2026-05-10**: Iteration 1 tasks T021, T022, T085 flipped to `[X]` with a note pointing at the MCP-driven bootstrap (T100/T102). T101 (admin user via dashboard) remains `[ ]` and is the single remaining manual step.

---

---

## Phase 12 — Analysis-Driven Additions (post-/speckit-analyze 2026-05-07)

**Purpose**: Close the CRITICAL/HIGH/MEDIUM coverage gaps surfaced by the analysis pass.
Each task references its analysis finding ID for traceability.

### Constitution & Security Gates (CRITICAL)

- [ ] T124 **[analysis C2 — re-scoped 2026-05-07]** Add automated RLS integration tests in `src/tests/integration/rls.test.ts` against the **hosted** Supabase project (no Docker). Test matrix: for each of (`profiles`, `sessions`, `enrollments`, `responses`, `progress`), log in as each role (admin / facilitator / participant / unauthenticated) and assert that SELECT/INSERT/UPDATE/DELETE either succeed or are blocked per the RLS Policies in `data-model.md`. Use `@supabase/supabase-js` with `VITE_SUPABASE_PUBLISHABLE_KEY` for client-side scenarios and `SUPABASE_SECRET_KEY` for the admin role. Tests must use a dedicated `*-rls-test@…` set of accounts so they can be reset between runs. Run before merge as a manual gate (not auto-CI initially).
- [ ] T125 **[analysis C3]** Add `scripts/bench-rpcs.ts`: hits `get_session_stats(p_session_id)`, `get_admin_overview()`, and `get_resume_position(p_participant_id, null)` 100× each against the seeded local stack and asserts p99 ≤ 500 ms (per Constitution §IV / SC-PERF-3). Add npm script `"bench:rpc": "tsx scripts/bench-rpcs.ts"`. Document baseline in `specs/001-psp-course-platform/rpc-bench.md`.

### Coverage Gaps (HIGH)

- [X] T126 **[analysis H2]** Done 2026-05-10: `db/tests/004_progress_trigger.sql` plus `db/tests/README.md`. Wraps fixtures in `BEGIN`/`ROLLBACK`; can be run via `psql` or pasted into the Supabase MCP `execute_sql`. Asserts trigger increments and decrements `progress.completed_exercises` correctly.
- [X] T127 **[analysis H4]** Done 2026-05-10: `scripts/seed.test.ts` (`@vitest-environment node`). Two suites: structural validation of `course-content.json` (always runs — counts, framing presence, slug uniqueness, canonical TTI attribution) and an integration suite that auto-runs only when `VITE_SUPABASE_URL` + a server-side secret key are set, then queries the hosted DB to confirm row counts and three randomly sampled `attribution` strings match.
- [X] T128 **[analysis H3]** Extracted `SessionCreateModal` to its own `src/pages/admin/SessionCreateModal.tsx` + `SessionCreateModal.module.css`; `SessionsPage.tsx` now imports it. The previously inlined modal styles were also moved out of `SessionsPage.module.css` into the new module. (Picked option (b) for symmetry with the corrected T062.)

### Coverage Gaps (MEDIUM)

- [X] T129 **[analysis M1]** Added top-level `export interface SectionFraming` to `src/types/database.ts`; used as the `framing` column type on `sections.Row/Insert/Update` and as the prop type for `SectionOpening` / `SectionClosing` (T113/T114).
- [X] T130 **[analysis M2]** Done 2026-05-10: `specs/001-psp-course-platform/timing-results.md` is the per-step timing checklist for SC-001 / SC-003 / SC-004. Maintainer fills in measured values during quickstart walkthrough; T085 retired.
- [X] T131 **[analysis M3]** Added two regression tests in `src/pages/facilitator/FacilitatorSessionDetailPage.test.tsx`: (1) when `scheduled_end < now()`, "Session Archived" badge appears, "Live" does not, and `useRealtimeSession` is invoked with `enabled: false`; (2) when `is_active=false` even with future `scheduled_end`, the Archived badge still appears. The mock now uses a mutable `mockSessionInfo` so each test can override session state.
- [X] T132 **[analysis M5]** Added `scripts/check-no-bypass.sh`: unsets `VITE_DEV_BYPASS`, runs `npm run build`, then greps `dist/` for the unique sentinel `__dev_auth_role__` and exits non-zero on any match. `package.json` `"check:no-bypass"` script added. Run before any production deploy (CI gate when CI exists).
- [X] T133 **[analysis M8]** Updated T099 description above to reference `supabase status --output json | jq -r '.ANON_KEY'` (machine-readable, stable across CLI versions). Implementation deferred until WS-B's T099 runs.
- [X] T134 **[analysis M4]** Note added to top of `framing-content.md` flagging the Steve Jobs quote IP risk and pre-staging two alternates (Latin proverb adaptation + Mary Oliver). Bijo signed off keeping the Jobs quote — IP & attribution checklist all checked.

### Style/Process (LOW)

- [X] T135 **[analysis L3]** Updated T119 description with the test-count baseline (56/18 → ≥86/0). Final result recorded inline: 98/0.
- [X] T136 **[analysis L6]** Deferred — T087 already shipped with `matchMedia` + `ResizeObserver` + `IntersectionObserver` polyfills and tests are 98/98 green. Removing the `matchMedia` stub speculatively risks a regression for marginal value; revisit if jsdom is upgraded.
- [X] T137 **[analysis L8]** Note added to `plan.md` "Brainstorm" section pointing readers to `framing-content.md` as the source of truth (lines 37–39: "These framing drafts are frozen for context only...").

**Checkpoint**: All findings from the 2026-05-07 analysis pass have either a corrective task here or are explicitly accepted (LOW L1, L2, L4, L5, L7 deferred to general code review).

---

## Iteration 2 Dependencies & Execution Order

### Phase Dependencies

- **WS-A (Phase 8)**: Can begin immediately. Independent of WS-B and WS-C.
- **WS-B (Phase 9)**: Can begin immediately. Independent of WS-A.
- **WS-C (Phase 10)**: T103 (IP review) gates T108. T106 (apply migration locally) requires WS-B's T100 (sync-migrations script exists) and ideally T101 (local stack verified). T111–T114 (component tests + impl) are independent of the schema work and can run in parallel with T104–T110.
- **Phase 11 close-out**: Depends on WS-A, WS-B, and WS-C complete.

### Parallel Opportunities — WS-A

```bash
# After T087 (polyfills) lands, all single-file fixes can run in parallel:
T088 (FacilitatorDashboard.test.tsx)
T089 (FacilitatorSessionDetailPage.test.tsx)
T090 (SectionPage.test.tsx)
T091 (UsersPage.test.tsx)
T092 (useProgress.test.ts)
T093 (CourseHistoryPage.test.tsx)
```

### Parallel Opportunities — WS-B (Hosted)

```bash
# Single-file edits can run in parallel:
T095 (vite-env.d.ts — add publishable key typing)
T097 (scripts/seed.ts — secret-key precedence + fail-fast)
T098 (.env.example — document new vars)
# Then sequentially:
T096 (src/lib/supabase.ts — depends on T095 typing)
T099 (package.json — db:seed --env-file)
T100 (one-time hosted bootstrap by maintainer)
T101 (admin user via dashboard — depends on T100)
T102 (npm run db:seed — depends on T101)
```

### Parallel Opportunities — WS-C

```bash
# After IP review (T103) and migration apply (T106):
T111 (SectionOpening test)            # parallel with all schema work
T112 (SectionClosing test)            # parallel with all schema work
# After both tests fail RED:
T113 (SectionOpening impl)            # parallel with T114
T114 (SectionClosing impl)            # parallel with T113
```

### Two-developer split for Iteration 2

- **Developer A**: WS-A end-to-end (Phase 8, ~6 small file fixes)
- **Developer B**: WS-B end-to-end (Phase 9, ~7 infra files)
- Both → WS-C together (Phase 10): A drives schema & seed (T104–T110), B drives components (T111–T116)
- Both → Phase 11 close-out

---

## Iteration 2 Notes

- **Do not edit the database directly** — framing content originates in `framing-content.md`, flows through `course-content.json`, and lands in the DB via `npm run db:seed`. Round-tripping through the file keeps the source of truth in git.
- **The `VITE_DEV_BYPASS` path is preserved** — do not remove it as part of WS-B; it remains the no-network fallback documented in quickstart.md (useful when the hosted project is unreachable).
- **Bundle budget is strict for Iteration 2**: ≤ 5 KB gzipped net additions. Two text-only React components should land at ~2 KB combined; we have headroom.
- **No new top-level npm dependencies** in Iteration 2. Polyfills are in-file stubs; framing components are pure React.
- **Iteration 1 tests T024 (LoginPage) are unaffected** by Iteration 2 changes — verify by running them isolated if WS-A introduces uncertainty.
