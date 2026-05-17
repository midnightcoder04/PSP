# Contract — Personality Matched-Style Deep-Dive

## Slide-group sequence (Personality section, post-iter6)

| SG | Exercises | Notes |
|---|---|---|
| 1 | `disc-introduction` | info — kept from iter5 |
| 2 | `core-style-q1-extroversion`, `core-style-q2-orientation` | checkbox quiz — kept |
| 3 | `core-style-result` | info, `computed='core_style'` — kept |
| 4 | `disc-profile-d`, `disc-profile-i` | info read-throughs — kept |
| 5 | `disc-profile-s`, `disc-profile-c` | info read-throughs — kept |
| **7** | `core-style-characteristics` | NEW info — per-style "If you are HIGH X, you are…" bullets |
| **8** | `core-style-ideal-environment` | NEW info — per-style "IDEAL ENVIRONMENT FOR THE HIGH X" bullets |
| **9** | `core-style-traits-checklist` | NEW checkbox — per-style optional traits, persisted |
| **10** | `core-style-comfort-zones` | NEW info — per-style "COMFORT ZONES for HIGH X" pairs |
| — (excluded) | `my-core-style` | Soft-hidden: `slide_group=NULL`, `order_index=99`. Responses preserved, but row no longer appears in the rendered slide track. |

Note: `slide_group = 6` is intentionally vacated (was `my-core-style`). `groupExercisesBySlide` MUST handle non-contiguous slide_group values without renumbering (existing behaviour — verified in iter5).

## Per-style content selection (info branch)

When `SectionPage.renderExercise` encounters an `info`-typed exercise whose `content_json.computed === 'core_style_section'`:

1. Look up the two `computed_inputs` exercise IDs in the `responses` map.
2. Call `resolveCoreStyleFromResponses(q1Resp, q2Resp)` (existing iter5 helper).
3. If non-null `result`: render `sections_by_style[result]` via `parseBlocks` (from `src/lib/markdownBlocks.ts`).
4. If null result (one or both quiz answers missing): render `content` (the fallback string), which directs the participant back to the quiz.

### Fallback content

Same string for all four new info rows:

> "Answer the two questions on slide 2 to see your matched style's content here."

## Per-style options selection (checkbox branch)

When `SectionPage.renderExercise` encounters a `checkbox`-typed exercise whose `content_json.computed === 'core_style_options'`:

1. Look up the two `computed_inputs` exercise IDs in the `responses` map.
2. Call `resolveCoreStyleFromResponses(q1Resp, q2Resp)`.
3. If non-null `result`: render `<CheckboxExercise content={{ ...rest, options: options_by_style[result] }} />`.
4. If null result: render a static disabled prompt directing back to the quiz.

## Slide-gate semantics

- The three new info slides advance freely (info exercises are always treated as complete by `groupComplete`).
- The traits-checklist slide is OPTIONAL: the slide-gate MUST advance on Next without requiring any tick. Implementation: `slide_group` gating treats this checkbox as complete-by-default (option A: set `is_scored=false` so it's not counted in totals AND treated as info-equivalent in `groupComplete`; option B: persist an empty-selection response on mount). **Decision**: option A — set `is_scored=false` in the seed, and extend `groupComplete` to treat `is_scored=false` checkboxes as always complete.

## Test matrix (component-level)

| ID | Scenario | Expected |
|---|---|---|
| P1 | Quiz answered: E + T → D. Render Characteristics info row. | Block `sections_by_style.D` rendered; HIGH-I/S/C content NOT in DOM |
| P2 | Quiz answered: E + P → I. Render Traits Checklist. | Options from `options_by_style.I` rendered; D/S/C options NOT in DOM |
| P3 | Quiz not answered. Render any of the 4 deep-dive slides. | Fallback prompt rendered; no per-style content in DOM |
| P4 | Quiz answered: I + P → S. Tick 3 traits; navigate away; return. | Same 3 ticks persisted |
| P5 | Quiz changed from D to I mid-session. Re-enter Characteristics slide. | HIGH-I content now rendered (synchronous on response change) |
| P6 | `my-core-style` exercise exists in DB but `slide_group=NULL`. | NOT rendered in slide track; not counted in section progress denominator |
| P7 | Per-style content rendering uses `parseBlocks`. Numbered lines render as `<ol>`. | `<ol><li>Item 1</li>…</ol>` in DOM |

## Storage

Traits-checklist response stored under the NEW exercise id (`core-style-traits-checklist`'s UUID), independent of the quiz response. Schema unchanged:

```json
{
  "selected_ids": ["d_t1", "d_t3", "d_t10", "d_t14"]
}
```

Option IDs follow the convention `{styleLetter}_t{n}` (e.g. `d_t1` … `d_t17`, `i_t1` … `i_t16`, etc.) so that future analytics can group ticks by style.

## Performance

- Per-style payload is statically baked into the seed; render-time is O(1) object lookup.
- No additional network requests.
- TTI budget on `/course/personality` MUST remain ≤ 3 500 ms.
