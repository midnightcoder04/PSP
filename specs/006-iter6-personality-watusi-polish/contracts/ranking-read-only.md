# Contract — `RankingExercise` Read-Only Sorted Mode

## Trigger

`content.interaction === 'sorted'` (new value alongside existing `'drag'` and `'buttons'`).

## Behaviour

1. **No interaction surface**: no drag handles, no up/down buttons, no editable affordance. Rows render as a static, semantic list.
2. **Order**: rows render in `derived.order` (already implemented via `computeDerivedOrder`). The order recomputes whenever `derivesFromResponse` changes — no saved `order` ever wins.
3. **No # rank column**: the existing `.rank` cell is omitted from the JSX for this branch. The CSS class is unchanged for the other two branches.
4. **Count chip**: rendered exactly as in `drag` / `buttons` modes — same `<span className={styles.countBadge}>` element — but pinned to the right of the row via `margin-left: auto`. The chip is `position: static` (i.e. participates in inline flow).
5. **Auto-complete-on-mount**: on the FIRST render where `interaction === 'sorted'` AND `initialResponse == null`, the component calls `save({ order: derivedOrder }, true)` exactly once. Subsequent renders are read-only and never re-persist. (Use a `useRef` guard to prevent double-save under React 18 StrictMode double-invoke.)
6. **Slide-gate**: the persisted `is_complete: true` flips the gate so the participant can click Next without manual interaction.

## a11y

- The list wrapper is `<ol role="list">` (semantic list).
- Each row is `<li role="listitem">` with `aria-label = "{label}, count {count}"` (no rank — implied by visual order).
- No `aria-grabbable`, no `aria-dropeffect`, no drag-related ARIA.
- Focus order: the count chip is `tabindex="-1"` (informational only).

## Props (unchanged)

```ts
interface RankingExerciseProps {
  exerciseId: string
  content: RankingContent           // narrowed by content.interaction
  initialResponse?: RankingResponse | null
  participantId: string
  sessionId?: string | null
  readOnly?: boolean                // facilitator-review mode; if true, DOES NOT auto-complete
  derivesFromResponse?: Response | null
}
```

## Test matrix

| ID | Scenario | Expected |
|---|---|---|
| T1 | `interaction='sorted'`, no `initialResponse`, derived counts present | Rows render in derived order; `save` called once with `{order: derived}, true`; no drag handles in DOM |
| T2 | `interaction='sorted'`, `initialResponse` already present | Rows render in derived order; `save` NOT called |
| T3 | `interaction='sorted'`, `derivesFromResponse` changes to new counts | Order updates synchronously on next render |
| T4 | `interaction='sorted'`, `readOnly={true}` | Read-only branch renders BUT auto-complete-on-mount is suppressed (facilitator review path) |
| T5 | `interaction='sorted'` — count chip has `position: static` (via computed style) | Inline-flow, not absolute |
| T6 | `interaction='sorted'` — DOM has no element with `class*=rank` (rank column omitted) | True |
| T7 | `interaction='drag'` (legacy WATUSI seed before migration 016) | Renders existing drag UI unchanged (regression guard) |

## Out of scope

- Animating the sort transition.
- Allowing the participant to manually override the sort.
- Multi-column rendering.
