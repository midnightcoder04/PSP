# Goal Setting Section — Iteration 4 Audit

Per AC-9 (testable assertion): every exercise in the `goal-setting` section must use one of `structured-text`, `rating-picker`, `ranking`, `table`, `checkbox`, or `info`, and no `text`-typed exercise with multiple implicit sub-questions may remain.

| Slug | Current type | Proposed type | Justification |
|------|--------------|---------------|---------------|
| `life-goal-inventory` | `table` | **no change** | Genuine 5-column data table (Category, Goal, Importance H/M/L, Ease H/M/L, Conflict Y/N) repeating across 24 rows. Tabular structure is the right primitive. |
| `goal-priorities` | `ranking` | **`ranking` + `interaction: 'drag'`** (US6 pattern) | Already a ranking; upgrade to drag-and-drop to match Roles UX. |
| `cross-impact-matrix` | `table` | **no change** | Genuine N×N matrix (8 goals × 8 goals + label column). Spec explicitly states this remains `table`. |
| `goal-achievement-plan` | `text` | **`structured-text`** | The current prompt asks 6 reflection questions per goal + obstacle/action sub-blocks (4 sub-blocks). One huge textarea hides the structure. Split into a structured block per goal (6 question slots + 3 obstacle slots = 9 sub-questions total for the participant's #1 goal — scope contained to top goal in this iteration). |
| `success-failure-alibis` | `checkbox` | **no change** | Already a checklist; large item count but the primitive is right. |
| `declaration-of-self-esteem` | `text` | **no change** | A single open reflection prompt, not a multi-question form. `text` with `min_length` is correct. |
| `copyright-footer` | `info` | **no change** | Informational only. |

Conclusion: two changes — promote `goal-priorities` ranking to drag-and-drop, and rewrite `goal-achievement-plan` to `structured-text` for the participant's top goal (9 sub-question slots).

This file is committed alongside the seed update for traceability.
