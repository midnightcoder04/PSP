# RLS Helper Contracts (`public.*` — added in migration 008)

These helpers are the load-bearing primitives that every RLS policy now calls. They
are `SECURITY DEFINER STABLE` with `search_path = public`, and `EXECUTE` is granted
only to `authenticated` (revoked from `anon`). The contract below pins what each one
returns for the fixture matrix.

The helper tests live in the same `scripts/rpc.test.ts` file under
`describe('helpers', …)`. Each test invokes the helper via
`client.rpc(name, args)` from the appropriate role's client and asserts the boolean
return.

---

## `is_admin(uid uuid) → boolean`

| Caller | uid arg | Expected return |
|---|---|---|
| admin | admin.id | `true` |
| admin | facilitator.id | `false` |
| admin | inactive.id | `false` (inactive admins must NOT be considered admin) |
| facilitator | admin.id | `true` (the helper is purely about the *target* uid; caller doesn't matter — but the function MUST be callable by `authenticated`) |
| anon | admin.id | error (revoked from anon — supabase-js returns 401/403) |

**Note**: `is_admin` is *not* a "is the *caller* an admin" check; it asks "is `uid` an admin?". It's used inside RLS policies as `is_admin(auth.uid())`. The contract test verifies the function semantics, not the policy semantics.

---

## `is_active_user(uid uuid) → boolean`

| Caller | uid arg | Expected |
|---|---|---|
| admin | admin.id | `true` |
| admin | inactive.id | `false` |
| admin | random uuid | `false` |
| anon | admin.id | error (revoked from anon) |

---

## `facilitates_session(uid uuid, sid uuid) → boolean`

| Caller | (uid, sid) | Expected |
|---|---|---|
| facilitator | (facilitator.id, test_session.id) | `true` |
| facilitator | (admin.id, test_session.id) | `false` |
| facilitator | (facilitator.id, random uuid) | `false` |
| anon | any | error |

---

## `participant_in_session(uid uuid, sid uuid) → boolean`

| Caller | (uid, sid) | Expected |
|---|---|---|
| participant | (participant.id, test_session.id) | `true` |
| participant | (facilitator.id, test_session.id) | `false` |
| participant | (participant.id, random uuid) | `false` |
| anon | any | error |

---

## `facilitator_has_participant(uid uuid, pid uuid) → boolean`

| Caller | (uid, pid) | Expected |
|---|---|---|
| facilitator | (facilitator.id, participant.id) | `true` (test enrollment exists) |
| facilitator | (admin.id, participant.id) | `false` |
| facilitator | (facilitator.id, admin.id) | `false` |
| anon | any | error |

---

# RLS Access Matrix (operational — generated, not hand-asserted)

`scripts/audit-security.ts` enumerates every `(table, role, op)` triple and uses
the per-role test client to attempt the operation. Result is recorded in
`security-audit.md` as ✓ / ✗.

| Table | admin | facilitator (own session) | facilitator (other session) | participant (enrolled) | participant (other) | anon |
|---|---|---|---|---|---|---|
| profiles SELECT (self) | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| profiles SELECT (other in own session) | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| profiles UPDATE (self display_name) | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| profiles UPDATE (other) | ✓ (via admin policy) | ✗ | ✗ | ✗ | ✗ | ✗ |
| sessions SELECT (own / enrolled) | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| sessions INSERT | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| sessions UPDATE | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| sessions DELETE | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| enrollments SELECT (own session / own enrollment) | ✓ | ✓ | ✗ | ✓ (own) | ✗ | ✗ |
| enrollments INSERT/UPDATE/DELETE | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| sections SELECT | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| exercises SELECT | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| responses SELECT (own / facilitator-of-participant) | ✓ | ✓ | ✗ | ✓ (own) | ✗ | ✗ |
| responses INSERT (own only) | ✓ (admin always) | ✗ | ✗ | ✓ | ✗ | ✗ |
| responses UPDATE (own only) | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| progress SELECT | ✓ | ✓ (for participants in own sessions) | ✗ | ✓ (own) | ✗ | ✗ |

The script asserts each cell. A mismatch fails `audit:security`.
