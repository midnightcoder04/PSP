# Contract — Slide Navigation

The slide-navigation surface for SectionPage. Two contracts: the `useSlideState` hook and the `SlideNav` component.

---

## 1. `useSlideState` hook

```ts
interface SlideGroup {
  index: number              // 0..N-1
  exercises: Exercise[]      // ≥ 1 exercise; same slide_group key
}

interface UseSlideStateArgs {
  intro: boolean             // true if section has framing (always true today)
  slideGroups: SlideGroup[]
  responses: Record<string, Response>   // by exercise.id
  resumeExerciseId?: string | null
}

interface UseSlideStateResult {
  currentSlide: number                   // -1, 0..N-1, or N (closing)
  canGoNext: boolean                     // false if current slide is gated and incomplete
  canGoPrev: boolean                     // false only at intro
  goNext: () => void                     // no-op if !canGoNext
  goPrev: () => void                     // no-op if !canGoPrev
  goTo: (slide: number) => void          // bounded clamp; ignores forward jumps past first-incomplete
  isAtIntro: boolean
  isAtClosing: boolean
}
```

### Behaviour

- `canGoNext` rules:
  - On intro: `true`.
  - On a slide group: `true` iff every exercise in the group is either type `'info'` or has `responses[ex.id]?.is_complete === true`.
  - On closing: `true` (but `goNext` redirects to the next section or `/course/complete`).
- `canGoPrev` rules:
  - On intro: `false`.
  - Otherwise: `true`.
- Initial `currentSlide`:
  - If `resumeExerciseId` is set, find the slide group containing that exercise → `groups[i].index`.
  - Else `-1` (intro).
  - If every slide group is fully complete, set to `N` (closing) so returning participants land on the closing slide.

### Implementation notes

- `goNext`/`goPrev` set state synchronously; CSS handles the visible transform animation.
- The hook does NOT depend on URL params; URL stays static at `/course/:slug`.
- The hook DOES NOT bind global keyboard listeners. The `SlideNav` component's prev/next `<button>`s receive normal Tab/Enter focus.

---

## 2. `SlideNav` component

```ts
interface SlideNavProps {
  onPrev: () => void
  onNext: () => void
  canGoPrev: boolean
  canGoNext: boolean
  nextLabel?: string             // default '→' for normal slides; 'Begin →' for intro; 'Finish section' for last slide
  prevLabel?: string             // default '←'
  hint?: string | null           // text shown when canGoNext === false, e.g. 'Complete the exercise to continue'
}
```

### Rendering

```tsx
<nav className={styles.slideNav} aria-label="Slide navigation">
  <button
    type="button"
    onClick={onPrev}
    disabled={!canGoPrev}
    aria-label="Previous slide"
    className={styles.prev}
  >
    {prevLabel ?? '←'}
  </button>

  {hint && !canGoNext && <p className={styles.hint} aria-live="polite">{hint}</p>}

  <button
    type="button"
    onClick={onNext}
    disabled={!canGoNext}
    aria-label={nextLabel ?? 'Next slide'}
    className={styles.next}
  >
    {nextLabel ?? '→'}
  </button>
</nav>
```

### Accessibility

- Both buttons get a visible focus ring (`:focus-visible`).
- `aria-disabled` mirrors `disabled`; the right-arrow button is announced "Next slide, disabled — Complete the exercise to continue" by screen readers when `canGoNext === false`.
- The `aria-live="polite"` hint announces the gating reason to AT users without stealing focus.

### Keyboard

- Native button semantics — Tab to focus, Enter or Space to activate. No global arrow-key bindings.

### Styling

- Position: sticky at the bottom of the section content, inside `PageShell`.
- Width: full container width with prev on the left, next on the right.
- Visual disabled state: 40% opacity, `cursor: not-allowed`. Colour token `--color-disabled-bg`.

---

## 3. `SectionPage` rewrite outline

Pseudocode (full file in `src/pages/course/SectionPage.tsx`):

```tsx
function SectionPage({ readOnly }) {
  const { sectionSlug } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { section, exercises, responses, loading, lastExerciseId } = useSectionData(sectionSlug, profile?.id)

  const slideGroups = useMemo(() => groupExercisesBySlide(exercises), [exercises])
  const {
    currentSlide,
    canGoNext, canGoPrev,
    goNext, goPrev,
    isAtIntro, isAtClosing,
  } = useSlideState({
    intro: !!section?.framing,
    slideGroups,
    responses,
    resumeExerciseId: lastExerciseId,
  })

  if (loading) return <Spinner />

  return (
    <PageShell title={section?.title}>
      <SlideTrack currentSlide={currentSlide} totalSlides={slideGroups.length + 2 /* intro + closing */}>
        <SectionIntroSlide framing={section?.framing} onBegin={goNext} />

        {slideGroups.map(group => (
          <ExerciseSlide
            key={group.index}
            group={group}
            responses={responses}
            participantId={profile!.id}
            readOnly={readOnly}
          />
        ))}

        <SectionClosingSlide
          section={section!}
          isLastSection={isLastSection(section)}
          onContinue={() => handleContinue(navigate, section)}
        />
      </SlideTrack>

      <SlideNav
        onPrev={goPrev}
        onNext={goNext}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        nextLabel={isAtIntro ? 'Begin →' : isAtClosing ? (isLastSection(section) ? 'Finish course' : 'Continue to next section') : '→'}
        hint={!canGoNext && !isAtIntro && !isAtClosing ? 'Complete the exercise to continue' : null}
      />
    </PageShell>
  )
}
```

`SlideTrack` is a thin presentational wrapper that translates the active slide into view via CSS.

---

## 4. `useSectionLock` hook

```ts
interface UseSectionLockArgs {
  sections: Section[]            // sorted by order_index
  progressMap: Map<string, Progress>
}

interface SectionLock {
  section: Section
  index: number
  isLocked: boolean
  prereq: Section | null
  prereqTitle: string | null
}

function useSectionLock(args: UseSectionLockArgs): SectionLock[]
```

### Rules

- `index === 0` → `isLocked = false`, `prereq = null`.
- `index > 0` → `isLocked = progressMap.get(sections[index-1].id)?.section_completed_at == null`, `prereq = sections[index-1]`.

Pure function of inputs. No I/O.

---

## 5. CourseHome render contract

For each section:

- **Unlocked + not started**: button card with ProgressRing at 0%, no badge.
- **Unlocked + in progress**: button card with ProgressRing at N%, "X / Y exercises" subtitle.
- **Unlocked + completed**: button card with ProgressRing at 100% + `<Badge variant="success">Complete</Badge>`.
- **Locked**: presentational card (non-button) with `<LockIcon />` overlay, greyed out (≥ 60% opacity), aria-label "Locked — complete {prereqTitle} first". Hover/focus reveals a tooltip with the prereq hint.
