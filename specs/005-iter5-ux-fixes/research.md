# Phase 0 — Research: Iteration 5 UX Fixes

This document resolves all `NEEDS CLARIFICATION` items identified in `plan.md §Phase 0`. Each section follows the format:

> **Decision** — what we chose
> **Rationale** — why
> **Alternatives considered** — what else evaluated

---

## R1 — Two-question quiz: one exercise or two?

**Decision**: **Two consecutive `checkbox` exercises with `allow_multiple: false`, both on the same `slide_group`.**

- `core-style-q1-extroversion` — prompt: "Are you predominantly EXTROVERTED or INTROVERTED?", two options (`q1_extroverted`, `q1_introverted`).
- `core-style-q2-orientation` — prompt: "Are you predominantly PEOPLE-ORIENTED or TASK-ORIENTED?", two options (`q2_people`, `q2_task`).

Both must be complete for the slide gate to advance.

**Rationale**:

- Re-uses the existing `checkbox(allow_multiple: false)` renderer (zero renderer changes).
- The slide gate from Iteration 4 already requires every non-info exercise on a slide to be `is_complete=true` before `canGoNext` flips. Two-checkbox-on-one-slide trivially satisfies it (consistent with how `identifying-attitudes` + `attitude-types-watusi` co-exist).
- Splitting the two prompts means each prompt has its own `responses` row, which makes the downstream "Core-Style-result" derivation a simple two-row lookup (`response_json.selected_ids[0]` from each).
- Slightly more rows in the seed, but no new schema, no new exercise type, no new renderer branch.

**Alternatives considered**:

1. **One `checkbox` exercise with two `options[]` groups in `content_json`.** Cleanest from a "one workbook question = one exercise" perspective, but requires extending `CheckboxContent` shape and `CheckboxExercise` to render two prompts + two option groups. Rejected: new renderer branch for a one-off use case. Bundle delta and test surface not worth it.
2. **A new `radio-quiz` exercise type.** Maximum semantic fidelity (you're really asking two single-choice questions), but introduces a new type into the registry, the slide-grouping logic, the database type union, and the section-page switch. Rejected: out of proportion with the fix's footprint and violates the "no new exercise types" constraint in `plan.md`.
3. **`structured-text` with two short fields.** Free-text answers ("Extroverted" / "Introverted") would let the user type prose, but then the Core-Style mapping needs string matching with all its edge cases. Rejected.

---

## R2 — WATUSI staleness root cause

**Decision**: **The WATUSI staleness is fully explained by the US3 slide-state regression** — the participant arrives at `/course/attitude` already on the closing slide, never sees the WATUSI ticks animate against `identifying-attitudes`, and concludes the counts are "not updating." `RankingExercise` requires **no code changes**; the existing chain (`CheckboxExercise.toggle()` → `useExerciseSave.save()` → `LocalResponseUpdateContext.localUpdate()` → `SectionPage.setResponses()` → re-render → `RankingExercise.derived` recompute via `useMemo`) is correct and synchronous.

The validation procedure:

1. Locally fix the slide-state reset (US3) first (a 5-line change to `useSlideState`).
2. Re-walk the Attitudes section end-to-end. Tick a W-statement; watch the WATUSI badge.
3. If the badge updates within one frame: US4 was a perception artefact of US3. No `RankingExercise` patch.
4. If the badge does NOT update: FR-032's workaround kicks in. The workaround would lift the upstream `checked: string[]` into a slide-scoped shared store and have WATUSI read from it directly without round-tripping through `responses`. **This branch is not expected to fire.**

**Rationale**:

- Reading `useExerciseSave.ts:74` shows `localUpdate?.(exerciseId, responseJson, isComplete)` fires synchronously BEFORE the debounced Supabase save. The `LocalResponseUpdateContext.Provider` in `SectionPage.tsx:329` writes `responses[exerciseId]` immediately via `setResponses`.
- `SectionPage` re-renders. `derivesFromResponse` is recomputed for `RankingExercise` (line ~271–272 in SectionPage).
- `RankingExercise.derived` is a `useMemo` over `[content, derivesFromResponse]`. New `derivesFromResponse` reference → recompute → new `counts`.
- `countForItemId` reads from `derived.counts` on every render. So the badge re-renders the new count.
- Conclusion: the existing chain is correct. The only failure mode would be SectionPage's `useEffect` overwriting `responses` after the debounced save resolves with a stale snapshot — but the upsert returns the same row we just wrote, so even that path is benign.

**Alternatives considered**:

1. **Patch `RankingExercise` to take a `liveCounts` prop sourced directly from the upstream `checkbox`'s in-component state.** Bypasses `responses` entirely. Tempting if the bug were real, but introduces a parallel state path and couples the two exercises. Rejected unless R2's validation says it's needed.
2. **Increase the `useExerciseSave` debounce.** Irrelevant — `localUpdate` already runs pre-debounce.
3. **Force re-render via key on `RankingExercise`.** Rejected — props already change; no extra key needed.

### R2 — Resolution (2026-05-16)

**Hypothesis A confirmed.** The Vitest assertion in `RankingExercise.test.tsx` "FR-030: count badges recompute when derivesFromResponse changes mid-render" passes against the current implementation without modification — when `derivesFromResponse` is rerendered with `checked: ['w_1', 'w_2', 'w_3']`, the W-group count badge updates to `3` in the same render commit. The FR-033 drag-completion assertion also passes without modification (`save()` is called with `is_complete=true` on every reorder click). FR-032's workaround branch is therefore **not required**; T020 closes as documentation-only and T021–T023 remain unfired. The original participant complaint was a symptom of US3's slide-state regression (they were never actually on the WATUSI slide while ticking), not a real WATUSI render bug.

---

## R3 — Multi-column root cause for info-slide prose

**Decision**: **Audit + scoped override.** The most likely source is **not** a `column-count` rule on `InfoExercise` itself (its CSS is clean — see `InfoExercise.module.css`). Two more probable sources:

- A `.exerciseBody` or `.slideTrack` grid rule with `grid-template-columns: repeat(2, 1fr)` inherited from an earlier iteration's design experiment; the `<p>` blocks inside `InfoExercise` become grid items, two per row.
- A global `.prose` class applied via a markdown renderer that we no longer use, leaking a `column-count: 2` rule.

The fix is to:

1. Grep `src/**/*.module.css` and `src/**/*.css` for `column-count`, `columns`, `column-width`, and `grid-template-columns`. Anything matching the InfoExercise ancestor chain is the culprit.
2. Add an explicit reset to `InfoExercise.module.css`:
   ```css
   .container { column-count: auto; columns: unset; }
   .text { width: 100%; max-width: 100%; }
   .text p, .text li { break-inside: avoid; column-span: all; }
   ```
3. If a `grid-template-columns` rule is the source, narrow the offending rule's selector (it almost certainly was meant for a different exercise type) rather than overriding it everywhere.

**Rationale**: Scoped overrides are safer than blanket resets. We don't know yet whether `column-count` or `grid-template-columns` is the bug; the audit comes first.

**Alternatives considered**:

1. **Set `column-count: 1` globally on `body`.** Rejected: too aggressive; would interfere with any intentional multi-column layout elsewhere.
2. **Wrap `InfoExercise` content in a portal that bypasses the grid.** Rejected: structural overkill for a CSS bug.

---

## R4 — Sidebar collapsed mode: icon-rail vs. full-hide

**Decision**: **Icon-rail collapse (≈ 56 px wide), retaining brand mark + nav icons + footer role pill.** Toggle stays visible at the rail's top edge to support re-expansion.

**Rationale**:

- Preserves nav affordance. Participants can still see which page they're on and one-click anywhere.
- Aligns with conventional dashboard sidebar patterns (Linear, GitHub, Notion).
- "Smooth" in the user input suggests a transition between two states (expanded ↔ collapsed), not a slide-in/slide-out modal pattern.
- If the user later decides they want full-hide, the change is small: swap the `.sidebar[data-collapsed='true']` CSS rule from `width: var(--sidebar-collapsed-width)` to `width: 0; visibility: hidden;` and adjust `aria-hidden` semantics. Documented as the reversion path in `contracts/sidebar-collapse.md`.

**Alternatives considered**:

1. **Full-hide.** Maximises canvas width. Rejected as the default because the toggle then needs a dedicated parking spot at the top-left of the main shell — a meaningful design surface that exceeds this iteration's scope.
2. **Hover-to-expand collapsed rail.** Nice-to-have but adds complexity; not requested. Out of scope.

---

## R5 — WATUSI zero-count badge presentation

**Decision**: **Hide the badge when count is zero.** Show the badge for counts ≥ 1.

**Rationale**:

- The count badge is decoration that communicates "you ticked this many statements in this group." Zero counts add noise without information.
- Layout is stable either way (the badge slot is a flex item; absence collapses the gap cleanly).
- `countForItemId` already returns the count; the JSX can simply guard on `count != null && count > 0`.

**Alternatives considered**:

1. **Always show, even at zero.** Marginal layout-stability argument. Rejected: introduces visual clutter.

---

## R6 — `useSlideState` reset mechanism: key remount vs. effect-driven reset

**Decision**: **Effect-driven reset, by passing `sectionSlug` (or any caller-provided `resetKey`) to the hook and calling `setCurrentSlide(initialSlide)` inside a `useEffect` that depends on the key + the readiness of `slideGroups`.**

The hook becomes:

```ts
export function useSlideState(args: UseSlideStateArgs & { resetKey?: string }) {
  // initialSlide is now a function callable on demand, not a useMemo with []
  const computeInitial = useCallback(() => deriveInitialSlide(args), [...])
  const [currentSlide, setCurrentSlide] = useState<number>(computeInitial)
  // Reset whenever the key changes AND data is ready
  useEffect(() => {
    if (args.slideGroups.length === 0) return // wait for data
    setCurrentSlide(computeInitial())
  }, [args.resetKey, args.slideGroups.length])
  // ... rest unchanged
}
```

**Rationale**:

- **Stable identity.** `SectionPage` keeps its data-loading effect, its responses cache, and the `LocalResponseUpdateContext` provider across section navigations — no full remount cost, no flash of "loading" screen between sections.
- **One source of truth.** Slide state derives from current data, not from a stale closure.
- **Test surface is minimal.** `useSlideState.test.ts` adds one test asserting that changing `resetKey` re-derives `initialSlide`.
- **Backward compatible.** When `resetKey` is `undefined` (e.g., any caller not currently passing it), the effect's dep change never fires after mount → behaviour is identical to today.

**Alternatives considered**:

1. **Key remount on a wrapper component.** Cleanest semantics ("each section = fresh component"), but throws away the `SectionPage` instance on every section change, which means re-running the supabase fetch effect for sections, exercises, responses, *and* progress. That's already what we do (the fetch effect re-runs on `sectionSlug` change), but the responses state cache rebuilds from scratch — fine but wasteful. Rejected as overkill.
2. **Lift slide state into `SectionPage` as `useState`.** Replaces the hook with inline state. Loses the encapsulation and the `useSlideState.test.ts` coverage. Rejected.
3. **Compute `initialSlide` synchronously on every render and `useState` lazy-init from a function.** Doesn't solve the problem — `useState` lazy initializer only runs on first mount, so the leftover state from the previous section's `setCurrentSlide` survives. Rejected.

---

## Open items (none)

All six research items resolved. Proceed to Phase 1 (data-model + contracts + quickstart).
