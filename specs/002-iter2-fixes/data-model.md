# Phase 1 Data Model — Test Fixtures

This iteration introduces no new persistent entities. It defines the **fixture lifecycle** for `scripts/rpc.test.ts` and `scripts/audit-security.ts`.

## Fixture entities

All entity ids are stable per-run (deterministic), generated from the prefix `__rpc_test_` so they're easy to spot in Supabase Studio if a teardown fails.

### Test users (auth.users + public.profiles)

| Role | Email | Password env | Profile is_active |
|---|---|---|---|
| admin | `__rpc_test_admin@example.invalid` | `RPC_TEST_PASSWORD` (single value, reused) | true |
| facilitator | `__rpc_test_facilitator@example.invalid` | same | true |
| participant | `__rpc_test_participant@example.invalid` | same | true |
| inactive_participant | `__rpc_test_inactive@example.invalid` | same | **false** |

**Creation**: `admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name } })`.
The `on_auth_user_created` trigger inserts the matching `public.profiles` row with `role='participant'`. Then a follow-up `from('profiles').update({ role, is_active })` sets the role and (for the inactive user) deactivates.

**Deletion**: `admin.auth.admin.deleteUser(id)`. FK ON DELETE CASCADE on `public.profiles.id` removes the profile row, which CASCADEs to enrollments and responses.

### Test session

| Field | Value |
|---|---|
| id | generated UUID, captured in `beforeAll` |
| title | `__rpc_test_session` |
| facilitator_id | facilitator user's id |
| created_by | admin user's id |
| scheduled_start | `now()::date` |
| scheduled_end | `(now() + interval '7 days')::date` |
| is_active | true |

### Test enrollment

| Field | Value |
|---|---|
| session_id | test session id |
| participant_id | participant user's id |
| is_active | true |

### Test responses

Two responses against the first exercise of the seeded `personality` section, owned by the participant test user, in the test session:

| # | exercise (slug) | session_id | is_complete |
|---|---|---|---|
| 1 | `disc-introduction` (`info` type) — see note | test session | true |
| 2 | `identifying-personal-style` (`checkbox`) | test session | false (in progress) |

**Note on `info` type**: `disc-introduction` is type `info` — it normally wouldn't have a response row. We use it deliberately to check the trigger handles a degenerate case (response on a non-interactive exercise). The trigger should still recompute progress correctly because it counts by `exercise.section_id`, not by exercise type.

The trigger `update_progress_on_response` then materialises one row in `public.progress` for the (participant, personality, session) tuple. Tests assert this row's shape.

## Lifecycle (vitest)

```
beforeAll (≤ 4 s)
├── admin.auth.admin.createUser × 4 (email_confirm: true)
├── from('profiles').update role+is_active for admin/facilitator/inactive
├── insert test session
├── insert test enrollment
├── insert two test responses (triggers update_progress_on_response)
└── signInWithPassword × 4 → cache one client per role

[tests run, sharing the cached clients]

afterAll (best-effort, wrapped in try/catch) (≤ 3 s)
├── from('responses').delete eq participant_id ∈ test users
├── from('enrollments').delete eq session_id = test session id
├── from('sessions').delete eq id = test session id
└── admin.auth.admin.deleteUser × 4
```

## Idempotency considerations

- **Re-run safety**: Before `beforeAll`'s `createUser`, the suite issues a best-effort `admin.auth.admin.listUsers` filter and pre-deletes any leftover `__rpc_test_*` users. Same for the test session (looked up by title).
- **Concurrent runs**: Not supported. The fixture namespace is fixed; two parallel runs would step on each other. Documented in quickstart.

## Invariants asserted by the suite

| Invariant | Where asserted |
|---|---|
| `is_admin(admin.id) = true` | helpers.md / `is_admin` test |
| `is_admin(facilitator.id) = false` | same |
| `is_admin(<inactive user>.id) = false` (the fixture inactive user has role=participant, so this proves only the role filter; the `is_active` filter for the admin role is documented in the implementation but not exercised by the current fixtures — adding an "inactive admin" fixture is a deferred follow-up, not on any AC path) | same |
| `participant_in_session(participant, session) = true` | `participant_in_session` test |
| `facilitates_session(facilitator, session) = true` | `facilitates_session` test |
| `facilitator_has_participant(facilitator, participant) = true` | `facilitator_has_participant` test |
| `get_admin_overview()` as admin returns valid shape | `get_admin_overview` test |
| `get_admin_overview()` as participant raises | same |
| `get_session_stats(session)` as facilitator returns rows for participant | `get_session_stats` test |
| `get_session_stats(session)` as random participant raises | same |
| `get_resume_position(participant.id, session.id)` returns the in-progress section/exercise | `get_resume_position` test |
| `get_resume_position(other_user_id, session.id)` raises | same |
| RLS: participant cannot SELECT another participant's response | `rls_matrix` test |
| RLS: facilitator can SELECT participant's response (when enrolled in their session) | `rls_matrix` test |
| Edge function `create-user` rejects non-admin caller | `edge_function_authz` test |
