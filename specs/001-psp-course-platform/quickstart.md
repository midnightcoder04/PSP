# Quickstart: PSP Course Platform

**Feature**: 001-psp-course-platform
**Date**: 2026-05-04

---

## Prerequisites

- Node.js 20+ and npm 10+
- A Supabase project (free tier sufficient for development)
- Supabase CLI (`npm install -g supabase`)
- Git

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd <repo-name>
npm install
```

---

## 2. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in values appropriate to the path you choose below.

> The `VITE_` prefix is required for Vite to expose these to the browser bundle.
> Never put `service_role` key in `.env.local` — it belongs in server-only contexts only.

---

## 3. Choose your dev path

The platform supports three dev paths. Pick one.

### Path A (recommended) — Local Supabase via Docker

Identical Postgres / Auth / Realtime / Storage to production, no internet required after
the initial pull, deletes cleanly with `supabase stop`.

**Prerequisites**: Docker Desktop, Supabase CLI (`npm i -g supabase` or
`brew install supabase/tap/supabase`).

```bash
# Start the local Supabase stack (first run pulls Docker images)
npm run db:start

# `supabase status` prints the local API URL and anon key.
# Copy them into .env.local:
#   VITE_SUPABASE_URL=http://127.0.0.1:54321
#   VITE_SUPABASE_ANON_KEY=<anon key from `supabase status`>

# Apply all migrations + run supabase/seed.sql (creates default admin user)
npm run db:reset

# Load PSP course content (sections + exercises + framing)
npm run db:seed

# Run the app
npm run dev
```

- App: http://localhost:5173
- Supabase Studio (DB inspection): http://localhost:54323
- Default admin login: `admin@local.dev` / `admin123` (created by `supabase/seed.sql`)
- To stop: `npm run db:stop`

### Path B — Hosted Supabase project

Use this for staging/production-shaped testing or when Docker isn't available.

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key from Settings → API>
```

```bash
# Link to your Supabase project, push schema, seed
supabase link --project-ref <project-ref>
supabase db push
npm run db:seed
```

Create the admin user via Supabase Dashboard → Authentication → Users → Add user, then run
this in the SQL Editor:

```sql
UPDATE public.profiles
SET role = 'admin', display_name = 'Platform Admin'
WHERE email = 'admin@example.com';
```

### Path C — UI-only dev bypass (no database, no Docker)

For frontend-only work where you don't need real persistence. The bypass is dev-mode only
and never ships to production (verified by T132 — `npm run check:no-bypass` greps `dist/`
to confirm no bypass code lands in builds).

```env
VITE_SUPABASE_URL=https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-anon-key
VITE_DEV_BYPASS=true
```

> The placeholder Supabase URL/key are never contacted — `lib/devAuth.ts` short-circuits
> before any network call when `VITE_DEV_BYPASS=true`.

```bash
npm run dev
```

Log in via the yellow "Dev bypass active" card on the login page using any of:

- `test` / `test123` → participant
- `facilitator` / `test123` → facilitator
- `admin` / `test123` → admin

---

## 4. Verify the install

After completing your chosen path, the app should be running at `http://localhost:5173`.
You should be able to:

- Log in (via your chosen path's credentials)
- See the `/course` home with all six section cards (Path A and B only)
- Open a section and see the new **opening framing** (quote + question + facilitator note)
  before the first exercise (Iteration 2 feature)
- Complete an exercise → response auto-saves (Path A and B; Path C does not persist)

---

## 6. Run Tests

```bash
# Unit + integration tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

> Tests require a local Supabase instance or a dedicated test project with its own
> `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## 7. Production Build

```bash
npm run build
# Output: dist/
```

Check bundle size before shipping:

```bash
npm run build -- --report
# Opens Vite bundle analyzer — verify total gzipped size is within 10 KB budget per addition
```

---

## Project Structure

```
src/
├── components/          # Shared component library (all UI components live here)
│   ├── ui/              # Atoms: Button, Input, Badge, ProgressRing, etc.
│   ├── exercise/        # Exercise type renderers: CheckboxExercise, TextExercise, etc.
│   └── layout/          # PageShell, Sidebar, TopBar
├── pages/
│   ├── auth/            # Login, ResetPassword
│   ├── admin/           # Dashboard, Users, Sessions
│   ├── facilitator/     # Dashboard, SessionDetail
│   └── course/          # CourseHome, SectionPage, ExercisePage
├── hooks/               # useAuth, useProgress, useRealtimeSession
├── lib/
│   ├── supabase.ts      # Supabase client initialization
│   └── constants.ts     # Route paths, query keys
├── context/
│   └── AuthContext.tsx  # Auth state + role-based routing guard
├── styles/
│   ├── tokens.css       # Design tokens (colors, spacing, typography)
│   └── global.css       # Reset + base styles
└── types/
    └── database.ts      # TypeScript types generated from Supabase schema

db/
├── migrations/          # Supabase migration SQL files
└── seeds/
    └── course-content.json  # Structured PSP exercise content

supabase/
└── config.toml          # Local Supabase dev config
```

---

## Key Development Patterns

### Auto-save response (debounced)
```ts
// In ExercisePage.tsx
const debouncedSave = useMemo(
  () => debounce((responseJson: object) => {
    supabase.from('responses').upsert({ ... })
  }, 300),
  []
)
```

### Role-based routing guard
```ts
// In AuthContext.tsx
if (!session || !profile?.is_active) return <Navigate to="/login" />
if (requiredRole === 'admin' && profile.role !== 'admin') return <Navigate to="/" />
```

### Realtime subscription (facilitator)
```ts
useEffect(() => {
  const channel = supabase
    .channel(`session:${sessionId}:progress`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'progress',
        filter: `session_id=eq.${sessionId}` }, () => refetch())
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}, [sessionId])
```

---

## Validation Steps (Constitution Check)

Before marking any task complete, verify:

1. Tests written and confirmed failing before implementation started
2. No new ad-hoc CSS — all styles via CSS Modules using `tokens.css` custom properties
3. Lighthouse audit: Performance ≥ 90, Accessibility ≥ 90 on each new route
4. Bundle diff reviewed: no unexplained additions > 10 KB gzipped
5. RLS tested manually: log in as each role and confirm unauthorized actions are blocked
