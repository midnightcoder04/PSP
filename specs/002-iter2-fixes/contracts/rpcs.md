# RPC Contracts (`public.*`)

Each RPC is invoked through PostgREST as `POST /rest/v1/rpc/{name}` from supabase-js
(`client.rpc(name, args)`). The contract below pins the **invocation envelope** (auth
required, args), the **success shape**, and the **failure shape** — both branches
are exercised by `scripts/rpc.test.ts`.

Where "raises" appears in the failure column, the function calls `RAISE EXCEPTION`
in plpgsql, which surfaces in supabase-js as `error.code === 'P0001'` and
`error.message === '<the raised text>'` (PostgREST 400).

---

## `get_admin_overview()` — defined in 006, fixed in 009

**Args**: none.
**Required role**: admin (function self-checks `auth.uid()` against `profiles.role`).
**Returns**: `jsonb` with the shape:

```jsonc
{
  "total_sessions":         <integer>,
  "active_sessions":        <integer>,
  "total_participants":     <integer>,
  "overall_completion_pct": <number | null>,   // null when no progress rows exist
  "sections": [
    { "slug": "<text>", "title": "<text>", "avg_completion_pct": <number | null> },
    ... (one per section, in `order_index` ASC)
  ]
}
```

**Test matrix**:

| Caller | Expected |
|---|---|
| admin | `error === null`, `data` matches shape; `Array.isArray(data.sections)` and `data.sections.length === 6` |
| facilitator | error: `code === 'P0001'`, message contains `Access denied` |
| participant | same |
| anon (unauthenticated) | error: PGRST301 / `JWT expired` *or* P0001 — whichever PostgREST surfaces; tested loosely as "error is non-null" |

**Regression guard**: a JSON-shape assertion of this form fails on the pre-009 nested-aggregate definition because `data === null` and `error.message` contains `aggregate function calls cannot be nested`. SC-002.

---

## `get_session_stats(p_session_id uuid)` — defined in 006

**Args**: `{ p_session_id: <uuid> }`.
**Required role**: facilitator-of-session OR admin (self-checked).
**Returns**: `setof(participant_id uuid, display_name text, overall_pct numeric, sections jsonb)`. Supabase-js returns `data` as an array of row objects.

**Per-row sections array shape** (one entry per progress row):

```jsonc
[
  { "slug": "<text>", "completed": <int>, "total": <int>, "completed_at": "<timestamptz | null>" }
]
```

**Test matrix**:

| Caller | Args | Expected |
|---|---|---|
| facilitator (owner) | test session id | `error === null`; `data` is an array; for the test session, `data.length === 1`; the row's `display_name === '<participant test display name>'`; `Array.isArray(row.sections)` |
| admin | test session id | same shape |
| participant (enrolled) | test session id | error: P0001 with `Access denied` (function ACL check fires) |
| facilitator (different session) | test session id | error: P0001 with `Access denied` |

---

## `get_resume_position(p_participant_id uuid, p_session_id uuid DEFAULT NULL)` — defined in 006

**Args**: `{ p_participant_id: <uuid>, p_session_id: <uuid | null> }`.
**Required role**: caller must be the participant (`p_participant_id == auth.uid()`).
**Returns**: `setof(section_slug text, exercise_slug text)` — at most one row.

**Test matrix**:

| Caller | Args | Expected |
|---|---|---|
| participant (test) | own id, test session id | `error === null`; if any in-progress section exists, `data` is `[{ section_slug, exercise_slug }]`; else `data === []` |
| participant (test) | facilitator's id, null | error: P0001 with `Access denied` |
| facilitator | participant's id, test session id | same — Access denied |

---

# Edge Function Contract — `create-user`

Invoked via `client.functions.invoke('create-user', { body: { email, display_name, role, password? } })`.

**verify_jwt**: `true` (Supabase enforces a valid JWT before the function runs).
**Caller authorization**: function body re-checks the caller's profile is `role='admin' AND is_active=true`. Non-admin callers get `403 { error: 'admin_required' }`.

**Success body**:
```json
{ "user": { "id": "<uuid>", "email": "<text>", "role": "<role>", "display_name": "<text>" } }
```

**Failure shapes**:
| Caller / Body | Status | Body |
|---|---|---|
| Missing/expired JWT | 401 | `{ error: 'missing_authorization' }` or `{ error: 'invalid_token' }` |
| Caller not in `profiles` | 403 | `{ error: 'profile_not_found' }` |
| Caller not admin | 403 | `{ error: 'admin_required' }` |
| Body missing email/display_name | 400 | `{ error: 'email_and_display_name_required' }` |
| Body invalid role | 400 | `{ error: 'invalid_role' }` |
| `auth.admin.createUser` failure | 400 | `{ error: 'create_failed', detail: '<message>' }` |
| Profile role UPDATE failure | 500 | `{ error: 'role_assignment_failed', detail: '<message>' }` |

**Test matrix** (4 callers × 1 valid body):

| Caller | Body | Expected |
|---|---|---|
| admin | `{ email: '__rpc_test_efnew@example.invalid', display_name: 'EF New', role: 'participant', password: '<32 random>' }` | success; profile created with role=participant; **cleanup the new user in afterAll** |
| facilitator | same body (different email) | 403 admin_required |
| participant | same | 403 admin_required |
| anon (no JWT) | same | 401 missing_authorization |
