# Contract — `useSlideState` reset semantics

## Public API (after this iteration)

```ts
export interface UseSlideStateArgs {
  intro: boolean
  slideGroups: Exercise[][]
  responses: Record<string, Response>
  resumeExerciseId?: string | null
  resetKey?: string  // NEW — typically the sectionSlug
}

export interface UseSlideStateResult {
  currentSlide: number
  canGoNext: boolean
  canGoPrev: boolean
  goNext: () => void
  goPrev: () => void
  goTo: (slide: number) => void
  isAtIntro: boolean
  isAtClosing: boolean
}

export function useSlideState(args: UseSlideStateArgs): UseSlideStateResult
```

Only addition: the optional `resetKey` field.

## Initial-slide derivation

```ts
function deriveInitialSlide(args: UseSlideStateArgs): number {
  const { intro, slideGroups, responses, resumeExerciseId } = args
  const totalGroups = slideGroups.length

  if (resumeExerciseId) {
    const idx = findGroupIndex(slideGroups, resumeExerciseId)
    if (idx >= 0) return idx
  }
  const allDone =
    totalGroups > 0 && slideGroups.every((g) => groupComplete(g, responses))
  if (allDone) return totalGroups
  return intro ? -1 : 0
}
```

This is the same function as today; the change is **when and how** we call it.

## Reset semantics

| Trigger | Action |
|---|---|
| First mount (component appears) | `useState` lazy initializer → `deriveInitialSlide(args)` |
| `resetKey` changes AND `slideGroups.length > 0` | `setCurrentSlide(deriveInitialSlide(args))` |
| `resetKey` changes AND `slideGroups.length === 0` | wait (effect early-returns); next render where slideGroups is non-empty will trigger reset |
| Any other arg change | no reset; user's `goNext` / `goPrev` / `goTo` calls drive state |

Concretely:

```ts
const computeInitial = () => deriveInitialSlide(args)
const [currentSlide, setCurrentSlide] = useState<number>(computeInitial)

useEffect(() => {
  if (slideGroups.length === 0) return
  setCurrentSlide(computeInitial())
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [args.resetKey, slideGroups.length])
```

Note the **conditional dependency**: we don't include `responses` or `resumeExerciseId` in the dep array, because we don't want the user's mid-session ticks to bounce them around between slides. Only the section identity + data readiness matters.

## Callers

| Caller | resetKey value |
|---|---|
| `SectionPage` | `sectionSlug` (from `useParams()`) |
| `CourseHistoryPage` (read-only) | none (single-section view; no resets needed) |

## Backward compatibility

Callers that don't pass `resetKey` see no behaviour change: the effect's dep `[undefined, slideGroups.length]` will fire once when `slideGroups.length` first becomes non-zero. At that point `currentSlide` was initialised at first mount with empty `slideGroups`, so `setCurrentSlide(deriveInitialSlide(args))` will land on the correct first slide.

**Migration note**: this incidentally also fixes a latent bug for the existing single-section consumers — they too were getting `currentSlide=0` from the first-render derivation with empty `slideGroups`. After this change, they land on the intro slide (when framing is present) instead of skipping it.

## Test matrix

| # | Scenario | Expected |
|---|---|---|
| T1 | Mount with `intro=true`, framing present, no resume, no responses | `isAtIntro=true`, `currentSlide=-1` |
| T2 | Mount with `intro=false`, no resume | `currentSlide=0` |
| T3 | Mount with `resumeExerciseId` matching group 2 | `currentSlide=2` |
| T4 | Mount with all groups complete | `currentSlide=totalGroups` (closing) |
| T5 | `resetKey` changes from `'personality'` to `'attitude'` mid-test, slideGroups changes from 4 entries to 3 entries, intro=true, no resume | `currentSlide=-1` (Attitudes intro) |
| T6 | `resetKey` changes but `slideGroups.length === 0` | `currentSlide` unchanged until slideGroups arrives |
| T7 | `goNext` called multiple times until closing slide, then `resetKey` changes | post-change: `currentSlide=-1` (NOT the closing index from the previous section) |
| T8 | `resetKey` unchanged, `responses` mutates, `goNext` called | no reset; `currentSlide` advances if `canGoNext` |

## Bug-fix mapping

This contract addresses:
- **FR-020** — slide state resets on section change.
- **FR-022** — initial slide computed with full data (lazy init + reset effect both call `deriveInitialSlide` against current args).

This contract leaves alone:
- **FR-021** (button label per slide) — handled in `SectionPage.tsx:323` already.
- **FR-030–FR-033** (WATUSI counts) — handled separately; see `research.md §R2`.
