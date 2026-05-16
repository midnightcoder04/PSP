# Phase 1 — Data Model

This iteration introduces **no schema changes**. Three logical models change shape:

1. **Personality section's `exercises` rows** — content-only mutation in migration 015. Schema unchanged.
2. **Sidebar collapse state** — client-only state, persisted to `localStorage`.
3. **`useSlideState` derivation rules** — same TypeScript shape, new reset semantics.

---

## 1. Personality section — exercise rows after migration 015

Section row (`sections WHERE slug='personality'`) is **unchanged** (slug, title, framing, order_index, group_slug, icon_name all preserved from `004-content-restructure`).

The `exercises WHERE section_id = sections.id` rows change as follows. (Authoritative table also in `contracts/personality-exercises.md`.)

| # | slug | type | content shape | slide_group | is_scored | source in `psp_content.md` |
|---|---|---|---|---|---|---|
| 1 | `disc-introduction` | `info` | unchanged — DISC overview prose | 1 | false | lines 333–407 |
| 2 | `core-style-q1-extroversion` | `checkbox` | `{ prompt, options: [E, I], allow_multiple: false }` | 2 | true | line 414 |
| 3 | `core-style-q2-orientation` | `checkbox` | `{ prompt, options: [P, T], allow_multiple: false }` | 2 | true | line 415 |
| 4 | `core-style-result` | `info` | `{ content: "{computed: from q1+q2}" }` — see "Computed info" note below | 3 | false | lines 426–432 (mapping table) |
| 5 | `disc-profile-d` | `info` | strengths + ideal env + characteristics for HIGH D as read-through prose | 4 | false | lines 468–536 |
| 6 | `disc-profile-i` | `info` | as above, HIGH I | 4 | false | lines 540–614 |
| 7 | `disc-profile-s` | `info` | as above, HIGH S | 5 | false | lines 618–680 |
| 8 | `disc-profile-c` | `info` | as above, HIGH C | 5 | false | lines 684–747 |
| 9 | `my-core-style` | `text` | **unchanged from current seed** — single-textarea reflection prompt, `attribution: null`, `is_scored: false`. Only `order_index` (7 → 9) and `slide_group` (NULL → 6) shift. | 6 | false | lines 436–446 |

**Rows removed** (5): `identifying-personal-style` (the legacy quick D/I/S/C self-rating checkbox) plus `disc-core-style-d`, `disc-core-style-i`, `disc-core-style-s`, `disc-core-style-c` (the four per-style checkbox lists).

**Rows added** (7): `core-style-q1-extroversion`, `core-style-q2-orientation`, `core-style-result`, `disc-profile-{d,i,s,c}` (4 info read-throughs).

**Rows preserved** (2): `disc-introduction` and `my-core-style` keep their slugs and `content_json` byte-identically; only `order_index` and `slide_group` may shift.

**Slide-group layout** (post-migration):

- Slide 1: DISC introduction (info, auto-complete).
- Slide 2: two-question quiz (both checkboxes must be answered to advance).
- Slide 3: Core-Style result card (info, displays the mapped letter).
- Slide 4: HIGH D + HIGH I read-throughs (paired).
- Slide 5: HIGH S + HIGH C read-throughs (paired).
- Slide 6: People-Reading reflection (structured-text, **completion-gated**).

### Computed info — the `core-style-result` exercise

This is the one row that isn't pure-static. It's an `info`-type exercise, but its rendered content depends on the two upstream quiz responses. Two implementation paths:

- **Path A (preferred — no renderer changes)**: `content_json.content` is a static template like `"You answered Q1 = {q1} and Q2 = {q2}. Your Core Style is: {core}."`. The `SectionPage` renderer reads the upstream responses (`core-style-q1-extroversion`, `core-style-q2-orientation`), runs `mapCoreStyle(q1, q2)` from `src/lib/coreStyle.ts`, and substitutes `{q1}`, `{q2}`, `{core}` before passing `content` to `InfoExercise`. The substitution is a small string-replace; if either response is missing, render a fallback like "Answer both questions above to see your Core Style."
- **Path B (purist — adds a renderer branch)**: introduce a tiny `<CoreStyleResult>` component used only for this exercise's render. Adds 30 LOC and a new branch in `SectionPage.renderExercise()`.

`contracts/personality-exercises.md` records Path A as the chosen path (R1's spirit — minimum renderer churn).

---

## 2. Sidebar collapse state

```ts
// src/hooks/useSidebarCollapse.ts (NEW)

const STORAGE_KEY = 'psp:sidebar:collapsed'

export function useSidebarCollapse(): {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (next: boolean) => void
} {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch { /* ignore */ }
  }, [collapsed])
  const toggle = useCallback(() => setCollapsed((c) => !c), [])
  return { collapsed, toggle, setCollapsed }
}
```

**Consumers**:
- `Sidebar.tsx` — owns the toggle button and applies `data-collapsed={collapsed}` to its `<aside>`.
- `PageShell.tsx` — reads `collapsed` and applies `data-sidebar-collapsed={collapsed}` to its outer `.shell` so the CSS can switch `margin-left: var(--sidebar-width)` ↔ `margin-left: var(--sidebar-collapsed-width)`.

Two consumers, one state. Options:

- **Option 1 (chosen)**: lift the hook into a small `SidebarCollapseContext.Provider` mounted inside `PageShell`. Both `Sidebar` and the shell read from it. Single source of truth; no prop drilling.
- **Option 2**: each component calls `useSidebarCollapse()` independently; both read the same `localStorage` key and stay in sync via storage events. Rejected — duplicated state, harder to test.

CSS variables:

```css
:root {
  --sidebar-width: 240px;             /* existing — src/styles/tokens.css:36 */
  --sidebar-collapsed-width: 56px;     /* NEW */
  --sidebar-transition: width 200ms cubic-bezier(0.22, 1, 0.36, 1),
                        margin-left 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.sidebar { transition: width 200ms cubic-bezier(0.22, 1, 0.36, 1); }
.sidebar[data-collapsed='true'] { width: var(--sidebar-collapsed-width); }
.shell { /* the main content's margin-left is what visually animates */ }
.main { transition: margin-left 200ms cubic-bezier(0.22, 1, 0.36, 1); }
.shell[data-sidebar-collapsed='true'] .main { margin-left: var(--sidebar-collapsed-width); }
```

---

## 3. `useSlideState` derivation — new reset semantics

**Public API change**: adds an optional `resetKey?: string` field to `UseSlideStateArgs`. Everything else stable.

**Derivation rules** for the active slide (called both at mount and on `resetKey` change):

```
deriveInitialSlide(args):
  if args.resumeExerciseId:
    idx ← findGroupIndex(slideGroups, resumeExerciseId)
    if idx >= 0: return idx
  if slideGroups.length > 0 AND every group is complete:
    return slideGroups.length   // closing slide
  return args.intro ? -1 : 0    // intro slide if framing present, else slide 0
```

**Lifecycle**:

1. **Mount.** `useState(deriveInitialSlide(args))`. The lazy initializer captures the current args.
2. **Effect on `resetKey` change**, conditional on data readiness (`slideGroups.length > 0`):
   ```
   useEffect(() => {
     if (slideGroups.length === 0) return    // data not ready yet — wait
     setCurrentSlide(deriveInitialSlide(args))
   }, [resetKey, slideGroups.length])
   ```
3. **No effect on responses/resumeExerciseId** — those only matter at derivation time; later changes don't re-trigger the reset.

**State diagram**:

```
              ┌──────────────┐
              │   Unmounted   │
              └──────┬────────┘
                     │ mount
                     ▼
              ┌──────────────┐
   ┌──────────│   Mounted    │──────────┐
   │          │  slide=N₀     │          │
   │          └──────┬────────┘          │
   │ goNext         │                   │ resetKey change
   │ goPrev          │                   │  AND slideGroups ready
   ▼                │                   ▼
┌───────┐           │           ┌──────────────┐
│slide=k│           │           │   slide=N'   │
└───┬───┘           │           └──────┬───────┘
    │ goNext        │                  │
    └───────────────┴──────────────────┘
```

`N₀` and `N'` both come from `deriveInitialSlide(args)`; they differ only because the args were sampled at different times.

---

## State invariants

- The sidebar collapse state is **independent** of route. Persisted across reloads; not affected by section navigation.
- The slide state is **scoped per section** via `resetKey = sectionSlug`. Not persisted to `localStorage`; the resume position comes from `progress.last_exercise_id` (DB).
- Personality section exercise rows have **no FK dependencies** outside `exercises` (responses cascade-delete via the existing FK from Iter 1).

---

## Bundle accounting

| Surface | gzipped delta |
|---|---|
| `useSidebarCollapse.ts` + `SidebarCollapseContext` | ~0.4 KB |
| `Sidebar.tsx` toggle + chevron SVG (inline) | ~0.3 KB |
| `Sidebar.module.css` collapsed-rail rules | ~0.2 KB |
| `PageShell` margin-left transition + data attr | ~0.05 KB |
| `useSlideState` reset effect | ~0.05 KB |
| `coreStyle.ts` pure mapping fn | ~0.15 KB |
| `InfoExercise.module.css` width + column resets | ~0.1 KB |
| `SectionPage.module.css` slide-track height fix | ~0.05 KB |
| **Total** | **~1.3 KB** vs. 1.5 KB budget |

All within budget.

---

## Test surfaces (data-model perspective)

- **`useSidebarCollapse.test.ts`**: round-trip via mocked `localStorage`. State change calls setter; remount restores.
- **`useSlideState.test.ts`**: `resetKey` change → currentSlide recomputed. Resume from `progress.last_exercise_id` preserved.
- **`coreStyle.test.ts`**: four mappings (`E+T→D`, `E+P→I`, `I+P→S`, `I+T→C`) + the four "missing answer" fallbacks return `null`.
- **`personality-exercises.contract.test.ts`** (NEW under `db/tests/` or `scripts/`): the seed file's Personality section matches the inventory above byte-for-byte for the new rows. (Or its SQL equivalent `015_personality_exercises_invariants.sql`, which now also asserts the SC-IP-1 attribution invariant and the `my-core-style` type-preservation invariant — see `contracts/migration-015.md §Test plan`.)
