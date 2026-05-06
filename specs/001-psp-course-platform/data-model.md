# Data Model: PSP Course Platform

**Feature**: 001-psp-course-platform
**Phase**: 1 — Design
**Date**: 2026-05-04

All tables live in Supabase's `public` schema unless noted. All tables have Row Level Security
(RLS) enabled. `auth.users` is Supabase-managed; all other tables extend it via `profiles`.

---

## Entity: `profiles`

Extends `auth.users` with application-level identity and role.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users.id` ON DELETE CASCADE | Matches Supabase auth UID |
| `role` | `text` | NOT NULL, CHECK IN ('admin','facilitator','participant') | User's platform role |
| `display_name` | `text` | NOT NULL | Name shown in UI |
| `email` | `text` | NOT NULL, UNIQUE | Mirrors auth.users.email for RLS joins |
| `is_active` | `boolean` | NOT NULL DEFAULT true | Revoked access sets to false |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | Account creation time |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Last modification time |

**Indexes**: `profiles_role_idx` on `(role)`, `profiles_email_idx` on `(email)`

**Triggers**:
- `on_auth_user_created`: AFTER INSERT on `auth.users` → creates a `profiles` row with
  `role = 'participant'` as default; admin must update role for facilitators/admins.

**RLS Policies**:
- `SELECT`: Users can read their own profile. Admins can read all profiles. Facilitators can
  read profiles of participants enrolled in their sessions.
- `UPDATE`: Users can update their own `display_name`. Admins can update any column.
- `INSERT`: Only via the trigger from `auth.users`; direct insert blocked for non-admins.

---

## Entity: `sessions`

A workshop session run by a facilitator.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() | Session identifier |
| `facilitator_id` | `uuid` | NOT NULL, FK → `profiles.id` | Assigned facilitator |
| `title` | `text` | NOT NULL | e.g., "Batch 7 — May 2026" |
| `description` | `text` | | Optional notes for the session |
| `scheduled_start` | `date` | | Planned start date |
| `scheduled_end` | `date` | | Planned end date |
| `is_active` | `boolean` | NOT NULL DEFAULT true | False when archived |
| `created_by` | `uuid` | NOT NULL, FK → `profiles.id` | Admin who created it |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | |

**Indexes**: `sessions_facilitator_idx` on `(facilitator_id)`, `sessions_active_idx` on
`(is_active)`.

**RLS Policies**:
- `SELECT`: Admins see all sessions. Facilitators see sessions where `facilitator_id = auth.uid()`.
  Participants see sessions they are enrolled in via `enrollments`.
- `INSERT/UPDATE/DELETE`: Admins only.

---

## Entity: `enrollments`

Maps participants to sessions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() | |
| `session_id` | `uuid` | NOT NULL, FK → `sessions.id` ON DELETE CASCADE | |
| `participant_id` | `uuid` | NOT NULL, FK → `profiles.id` ON DELETE CASCADE | |
| `enrolled_at` | `timestamptz` | NOT NULL DEFAULT now() | |
| `is_active` | `boolean` | NOT NULL DEFAULT true | False when unenrolled |

**Indexes**: `enrollments_session_idx` on `(session_id)`, `enrollments_participant_idx` on
`(participant_id)`, UNIQUE on `(session_id, participant_id)`.

**RLS Policies**:
- `SELECT`: Admins see all. Facilitators see enrollments for their sessions. Participants see
  their own enrollments.
- `INSERT/UPDATE/DELETE`: Admins only.

---

## Entity: `sections`

The six course segments of the PSP framework. Seeded at initialization; not user-editable.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() | |
| `slug` | `text` | NOT NULL, UNIQUE | URL-safe key: `personality`, `attitudes`, `values`, `roles`, `skills`, `goal-setting` |
| `title` | `text` | NOT NULL | Display title |
| `subtitle` | `text` | | e.g., "Filter 1 of 5" |
| `description` | `text` | | Brief section overview |
| `order_index` | `integer` | NOT NULL | 1–6, determines navigation order |
| `icon_name` | `text` | | CSS icon class or SVG key |
| `framing` | `jsonb` | NULL allowed | **(Iteration 2)** Per-section facilitator framing — opening quote, opening question, "facilitator says" prompt, "why this matters" paragraph, closing reflection, bridge-to-next. Schema below. |

**`framing` JSONB schema** *(Iteration 2 — validated at seed time, not at SQL time)*:

```jsonc
{
  "opening_quote":      { "text": "string (≤25 words)", "attribution": "string" },
  "opening_question":   "string",
  "facilitator_says":   "string",
  "why_it_matters":     "string",
  "closing_reflection": "string",
  "bridge_to_next":     "string | null"   // null on the final section
}
```

When `framing` is `NULL`, the UI renders no `SectionOpening` / `SectionClosing` blocks
(graceful degradation for sections that haven't yet been authored).

**RLS Policies**:
- `SELECT`: Any authenticated user with `is_active = true` in `profiles`.
- No INSERT/UPDATE/DELETE via client (seeded data only).

---

## Entity: `exercises`

Individual interactive elements within each section. Seeded at initialization.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() | |
| `section_id` | `uuid` | NOT NULL, FK → `sections.id` | Parent section |
| `slug` | `text` | NOT NULL | URL-safe key within section |
| `title` | `text` | NOT NULL | Exercise heading |
| `type` | `text` | NOT NULL, CHECK IN ('checkbox','text','table','ranking','info') | Interaction type |
| `content_json` | `jsonb` | NOT NULL | Structured content (see schema below) |
| `order_index` | `integer` | NOT NULL | Order within section |
| `is_scored` | `boolean` | NOT NULL DEFAULT false | True for DISC-style scored items |
| `attribution` | `text` | | Attribution/trademark text to display inline |

**`content_json` schema by exercise type**:

```jsonc
// type: "checkbox"
{
  "prompt": "Select all that apply:",
  "options": [
    { "id": "opt_1", "label": "Active", "value": 1 },
    { "id": "opt_2", "label": "Assertive", "value": 2 }
  ],
  "allow_multiple": true
}

// type: "text"
{
  "prompt": "Describe a time when...",
  "placeholder": "Write your reflection here...",
  "min_length": 0,
  "max_length": 2000
}

// type: "table"
{
  "prompt": "Complete the table below:",
  "headers": ["Experience", "Skills Used", "Enjoyment Level"],
  "rows": 5,
  "col_types": ["text", "text", "scale"]
}

// type: "ranking"
{
  "prompt": "Rank these values from most to least important:",
  "items": [
    { "id": "val_1", "label": "Achievement" },
    { "id": "val_2", "label": "Balance" }
  ]
}

// type: "info"
{
  "content": "Markdown-safe plain text for reading-only sections",
  "attribution": "D.I.S.C. model — Bill Bonnstetter / Target Training International"
}
```

**Indexes**: `exercises_section_idx` on `(section_id)`, `exercises_order_idx` on
`(section_id, order_index)`, UNIQUE on `(section_id, slug)`.

**RLS Policies**:
- `SELECT`: Authenticated users with active profiles.
- No client INSERT/UPDATE/DELETE.

---

## Entity: `responses`

Stores every participant's answer to every exercise. Upserted on each interaction.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() | |
| `participant_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `exercise_id` | `uuid` | NOT NULL, FK → `exercises.id` | |
| `session_id` | `uuid` | FK → `sessions.id` | Nullable (allows solo/review access) |
| `response_json` | `jsonb` | NOT NULL | Participant's answer (structure mirrors exercise type) |
| `is_complete` | `boolean` | NOT NULL DEFAULT false | True once participant marks exercise done |
| `created_at` | `timestamptz` | NOT NULL DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT now() | Auto-updated on every upsert |

**`response_json` examples**:

```jsonc
// checkbox
{ "selected_ids": ["opt_1", "opt_3"] }

// text
{ "value": "I recall feeling most energized when..." }

// table
{ "rows": [["Led a team", "Leadership, Communication", "9"], [...]] }

// ranking
{ "order": ["val_3", "val_1", "val_2"] }
```

**Indexes**: UNIQUE on `(participant_id, exercise_id, session_id)` — one response per
participant per exercise per session. Index on `(session_id)` for facilitator queries.
Index on `(participant_id)` for course resume queries.

**RLS Policies**:
- `SELECT`: Participants read their own responses. Facilitators read responses of participants in
  their sessions. Admins read all.
- `INSERT/UPDATE`: Participants can write only their own responses (`participant_id = auth.uid()`).
  Upsert pattern used to avoid duplicate rows.
- `DELETE`: Not permitted via client; responses are permanent.

---

## Entity: `progress`

Denormalized progress summary per participant per section, updated by a Postgres trigger on
`responses`. Avoids expensive COUNT queries on every dashboard load.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK DEFAULT gen_random_uuid() | |
| `participant_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `section_id` | `uuid` | NOT NULL, FK → `sections.id` | |
| `session_id` | `uuid` | FK → `sessions.id` | Nullable |
| `completed_exercises` | `integer` | NOT NULL DEFAULT 0 | Count of `is_complete = true` responses |
| `total_exercises` | `integer` | NOT NULL | Total exercises in section (denormalized) |
| `section_completed_at` | `timestamptz` | | Set when `completed_exercises = total_exercises` |
| `last_exercise_id` | `uuid` | FK → `exercises.id` | Last exercise interacted with (for resume) |
| `last_activity_at` | `timestamptz` | NOT NULL DEFAULT now() | |

**Indexes**: UNIQUE on `(participant_id, section_id, session_id)`. Index on `(session_id)` for
facilitator queries.

**Triggers**:
- `update_progress_on_response`: AFTER INSERT OR UPDATE on `responses` where `is_complete`
  changes → recalculates `completed_exercises`, sets `section_completed_at` if full, updates
  `last_exercise_id` and `last_activity_at`.

**RLS Policies**:
- `SELECT`: Participants read their own. Facilitators read their session participants'. Admins all.
- `INSERT/UPDATE`: Only via trigger (no client writes).

---

## PostgreSQL Functions (Supabase RPC)

### `get_session_stats(p_session_id uuid)`

Returns per-participant completion summary for a session. Used by facilitator and admin
dashboards.

```sql
RETURNS TABLE (
  participant_id   uuid,
  display_name     text,
  overall_pct      numeric,   -- 0–100
  sections         jsonb      -- [{slug, completed, total, completed_at}]
)
```

### `get_admin_overview()`

Returns platform-wide stats. Admin-only (RLS checked inside function).

```sql
RETURNS jsonb  -- {total_sessions, active_sessions, total_participants, overall_completion_pct, sections: [...]}
```

### `get_resume_position(p_participant_id uuid, p_session_id uuid)`

Returns the last section slug and exercise slug for the course resume feature.

```sql
RETURNS TABLE (
  section_slug   text,
  exercise_slug  text
)
```

---

## Realtime Subscriptions

| Channel | Table | Filter | Consumer |
|---|---|---|---|
| `session:{session_id}:progress` | `progress` | `session_id=eq.{id}` | Facilitator dashboard |
| `session:{session_id}:responses` | `responses` | `session_id=eq.{id}` | Facilitator live view |

Realtime is enabled only on `progress` and `responses` tables to minimize Supabase Realtime
bandwidth.

---

## Entity Relationship Summary

```
auth.users
    │ (trigger: on_auth_user_created)
    ▼
profiles ──────────────────────────────────────┐
    │ role: admin | facilitator | participant   │
    │                                           │
    ├──(created_by)──► sessions ◄──(facilitator_id)
    │                     │
    │                  enrollments ◄── participant_id ──► profiles
    │
    ├──► responses (participant_id)
    │         └── exercise_id ──► exercises ──► sections
    │
    └──► progress (participant_id)
              └── section_id ──► sections
```
