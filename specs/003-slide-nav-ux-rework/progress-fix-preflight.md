# Migration 013 — Pre-Flight Diff

**Date**: 2026-05-15
**Project**: `okedskadkspeiyxjslqc` (Supabase, PG 17.6)
**Migration**: [db/migrations/013_fix_progress_nulls.sql](../../db/migrations/013_fix_progress_nulls.sql)

This is the dry-run output captured by running the full migration body (dedup + constraint swap + trigger swap + backfill) inside a `BEGIN … ROLLBACK;` block against the live DB. The live DB is unchanged. Aggregations below show what the persisted state WOULD become if applied.

---

## Aggregate row-count delta

| Table | Pre-013 rows (session_id NULL) | Post-013 rows (session_id NULL) | Delta |
|---|---|---|---|
| `responses` | 72 | 13 | **−59 duplicates** |
| `progress`  | 72 | 5  | **−67 duplicates** |

Every deleted row is a true duplicate (identical `(participant_id, …_id, session_id=NULL)` key). The survivor is the most-recent row by `updated_at` / `last_activity_at`, tie-broken on `id`.

---

## Per-participant section-state changes

| participant_id (prefix) | slug | post completed | post total (info excluded) | was_complete | will_be_complete | change |
|---|---|---|---|---|---|---|
| 706a8245-…7b09ede37e25 | personality | 6 | 6 | ✅ | ✅ | NO_CHANGE |
| 706a8245-…7b09ede37e25 | values      | 1 | 3 | ✅ | ❌ | **FLIP_TO_INCOMPLETE** |
| 706a8245-…7b09ede37e25 | roles       | 0 | 5 | ❌ | ❌ | NO_CHANGE |
| 706a8245-…7b09ede37e25 | skills      | 0 | 4 | ❌ | ❌ | NO_CHANGE |
| 706a8245-…7b09ede37e25 | goal-setting| 1 | 6 | ❌ | ❌ | NO_CHANGE |

`attitudes` has 0 progress rows for this participant and therefore does not appear in the diff (no row to update). After the migration, Attitudes will be treated as "not yet started" — its first response save will insert a fresh row under the new `NULLS NOT DISTINCT` index.

### Interpretation

- **Personality** — was legitimately complete (the inflated `completed_exercises=23` was a duplicate-row artifact; the underlying 6 distinct interactive exercises ARE all `is_complete=true`). Stays complete. No participant-visible change.
- **Values** — `FLIP_TO_INCOMPLETE`. **This is the intended fix.** Values had `section_completed_at` set from the 2026-05-09 corrupt-row era (6 duplicate complete-ranking rows inflated `v_completed` past `v_total=3`). Post-migration, only 1 of the 3 interactive Values exercises is legitimately complete, so the section is correctly re-locked. Roles, Skills, and Goal-Setting therefore re-lock by cascade.
- **Roles / Skills / Goal-Setting** — already incomplete; remain incomplete. No change.

### Post-migration lock cascade (predicted)

```text
personality   ✅ complete   (Attitudes UNLOCKED)
attitudes     —             (no progress row; needs to be done)
values        🔒 locked     (prereq: Attitudes incomplete)
roles         🔒 locked     (prereq: Values locked)
skills        🔒 locked     (prereq: Roles locked)
goal-setting  🔒 locked     (prereq: Skills locked)
```

This is the **correct** participant journey state. The user's complaint ("Roles unlocks before Values is complete") will be resolved.

---

## Risk assessment

| Risk | Verdict |
|------|---------|
| Loss of legitimate response data during dedup | None. The most-recent payload per key is always kept; older payloads were stale overwrites that the participant already replaced via subsequent edits. |
| Loss of legitimate progress | One section (Values) re-locks. This is the bug being repaired — pre-migration state was wrong. |
| Other participants impacted | Only one participant has data under `session_id IS NULL` (706a8245-…); other rows exist under specific `session_id` values and are not in the affected scope. |
| Migration takes a long time | No — ~70 rows total to dedup, <1 second of work. |
| Trigger contract changes break other code | Only `useExerciseSave` writes responses; it already passes `onConflict: 'participant_id,exercise_id,session_id'` which the new unique index supports natively. No client change required for the trigger fix. |

---

## Recommendation

Apply. The single `FLIP_TO_INCOMPLETE` is the entire purpose of this migration. All other rows are NO_CHANGE.

To proceed, instruct the assistant to apply the migration via `mcp__plugin_supabase_supabase__apply_migration` with `name='013_fix_progress_nulls'` (task T012 in [tasks-progress-fix.md](tasks-progress-fix.md)).
