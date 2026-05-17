# Contract — Sidebar collapse

## State

Single boolean: `collapsed`. Owned by `useSidebarCollapse()` (see `data-model.md §2`). Persisted to `localStorage` under key `psp:sidebar:collapsed` as the string `"true"` or `"false"`.

State is **shared** between `Sidebar` and `PageShell` via `SidebarCollapseContext` mounted inside `PageShell`.

## Component contract

### `Sidebar.tsx`

- Renders a toggle `<button>` at the top-right edge of the `<aside>` (or anywhere visually accessible in both states).
- Toggle button props:
  - `aria-expanded={!collapsed}`
  - `aria-controls="primary-sidebar"` (the `<aside>` gets `id="primary-sidebar"`)
  - `aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}`
  - `type="button"`
- The `<aside>` gets `data-collapsed={collapsed}` for CSS targeting.
- In collapsed mode, hide the text labels (brand mark text, nav-link labels, footer role pill text) via CSS — keep icons visible. The `aria-label` attributes on `NavLink`s ensure screen readers still announce the destinations.

### `PageShell.tsx`

- Wraps its tree in `<SidebarCollapseContext.Provider value={...}>`.
- The `.shell` container gets `data-sidebar-collapsed={collapsed}`.
- No other shell-level change.

### CSS

```css
/* tokens (existing + new) */
:root {
  --sidebar-width: 220px;
  --sidebar-collapsed-width: 56px;
  --sidebar-transition-duration: 200ms;
  --sidebar-transition-easing: cubic-bezier(0.22, 1, 0.36, 1);
}

/* Sidebar.module.css */
.sidebar {
  width: var(--sidebar-width);
  transition: width var(--sidebar-transition-duration) var(--sidebar-transition-easing);
}
.sidebar[data-collapsed='true'] { width: var(--sidebar-collapsed-width); }
.sidebar[data-collapsed='true'] .navLink span:not(.icon),
.sidebar[data-collapsed='true'] .brandMark,
.sidebar[data-collapsed='true'] .rolePill {
  opacity: 0; pointer-events: none;
}

/* PageShell.module.css */
.main {
  margin-left: var(--sidebar-width);
  transition: margin-left var(--sidebar-transition-duration) var(--sidebar-transition-easing);
}
.shell[data-sidebar-collapsed='true'] .main { margin-left: var(--sidebar-collapsed-width); }
@media (max-width: 768px) {
  .main { margin-left: 0; }
  .shell[data-sidebar-collapsed='true'] .main { margin-left: 0; }
}
```

## Toggle button placement

Top-right corner of the sidebar, inside a small flex container next to the brand mark. In collapsed state, the chevron icon points right (`›`); in expanded state, left (`‹`). Implementation: an inline SVG or a Unicode glyph; no new font dependency.

## Accessibility checklist

- [x] `aria-expanded` reflects state.
- [x] `aria-controls` points to the `<aside>` id.
- [x] `aria-label` updates per state.
- [x] Keyboard: `Tab` reaches the toggle; `Enter` and `Space` activate it.
- [x] Visible focus ring preserved (uses existing `--color-trust` focus token).
- [x] Reduced motion: a `@media (prefers-reduced-motion: reduce) { .sidebar, .main { transition: none; } }` rule MUST be added.

## Persistence semantics

- On first ever visit (no storage key): `collapsed = false` (sidebar expanded by default).
- Storage write is debounced **only by React's effect coalescing** — no explicit debounce. Volume of writes is bounded by user toggle frequency (negligible).
- Storage corruption (non-`true`/`false` value): treated as `false`. Hook MUST swallow `JSON.parse` errors.

## Mobile escape hatch

At `@media (max-width: 768px)`, the existing rule `.sidebar { display: none; }` continues to apply. The toggle is rendered but invisible (`display: none` on its container under that media query). State persists across viewport resize.

## Test plan

- **Unit** (`Sidebar.test.tsx`):
  - Default: rendered with `data-collapsed='false'` and toggle `aria-expanded='true'`.
  - Click toggle: `data-collapsed='true'`, `aria-expanded='false'`, label changes.
  - LocalStorage written on toggle.
  - Mount with `localStorage` set to `'true'` → renders collapsed.
- **Integration** (manual, `quickstart.md §US1`):
  - Animation completes within 250 ms.
  - Main content reflows in lockstep.
  - Reload preserves state.
  - Mobile viewport: toggle hidden.

## Reversion path (icon-rail → full-hide)

If the user later requests full-hide, the change is contained to two CSS rules:

```diff
- .sidebar[data-collapsed='true'] { width: var(--sidebar-collapsed-width); }
+ .sidebar[data-collapsed='true'] { width: 0; overflow: hidden; }

- .shell[data-sidebar-collapsed='true'] .main { margin-left: var(--sidebar-collapsed-width); }
+ .shell[data-sidebar-collapsed='true'] .main { margin-left: 0; }
```

Plus moving the toggle to a fixed top-left position in the main shell so it remains reachable. Estimated < 1 hour of work. Documented here for traceability.
