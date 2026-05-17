# Contract: Authoritative Group → Section → Exercise Mapping

**Feature**: 004-content-restructure
**Source of truth for**: `db/seeds/course-content.json`, `src/lib/constants.ts:SECTION_SLUGS`, `db/seeds/ip-review.md`

This table is the single source of truth for what content lands where. Discrepancies between this document and the seed JSON are bugs in the seed JSON. Workbook citations point at `psp_content.md` line numbers (state at 2026-05-15; revisit if the .md is edited).

---

## Group 1 — Self Awareness

| § | Section (slug) | Title | Exercises (slug · type · workbook citation · mandatory-prompt count) |
|---|---|---|---|
| 1 | `personality` | Personality | `disc-introduction` (info, psp_content.md:344–365), `identifying-personal-style` (checkbox, :366–434), `disc-core-style-d` (checkbox, :468–508), `disc-core-style-i` (checkbox, :509–549), `disc-core-style-s` (checkbox, :550–591), `disc-core-style-c` (checkbox, :592–639), `my-core-style` (text, :436–446, **1 prompt** — single textarea OK) |
| 2 | `attitude` | Attitude | `attitudes-introduction` (info, :645–688), `identifying-attitudes` (checkbox, :689–779), `attitude-types-watusi` (ranking, :780–809), `attitude-power-points` (**audit per R9** — if multi-prompt, promote to structured-text; cite :810–832) |
| 3 | `values` | Values | `values-shopping-spree` (table, :847–891), `what-do-i-value` (ranking, :892–917), `top-three-values` (**promote to structured-text**, 3 questions: top1/top2/top3, :918–924) |
| 4 | `roles-and-demands` | Roles and Demands | `life-line-exercise` (text, :980–1008, **1 prompt — drawing canvas; keep as text**), `who-am-i-now` (table, :1036–1057), `past-experience-inventory` (structured-text, :1058–1144, **audit prompt count vs current 14 q ids**), `contract-with-myself` (structured-text, :1146–1188, **6 prompts: article_1..article_6**), `mission-statement` (structured-text, :1190–1222, **5 prompts: vision/self/others/world/one_sentence**) |
| 5 | `transferable-skills` | Transferable Marketable Skills | `transferable-skills-with-individuals` (rating-picker, :1260–1274), `transferable-skills-with-groups` (rating-picker, :1275–1295), `transferable-skills-information` (rating-picker, :1299–1339, **merged Gather+Manage+Store; consider 4 sub-pickers per R9 audit**), `favorite-strongest-skills` (**audit per R9** — :1341–1369; likely promote to structured-text with N prompts) |

**Self Awareness total**: 5 sections, **~22 exercises** (exact count fixed post-audit).

---

## Group 2 — Goal Setting

| § | Section (slug) | Title | Exercises |
|---|---|---|---|
| 6 | `specific-goals` | Specific Goals | `life-goal-inventory` (table, psp_content.md:1385–1413 + :1414–1541), `goal-priorities` (ranking, :1542–1555) |
| 7 | `goal-impact-matrix` | Goal Impact Matrix | `cross-impact-matrix` (table, :1556–1597) |
| 8 | `visualization` | Visualization | `visualization-practice` (info, **new** — body verbatim from :1598–1615 with attribution), `visualization-journal` (structured-text, **new**, 4 prompts: what_seen/who_present/place_details/one_action — drafted from :1607–1611) |

**Goal Setting total**: 3 sections, 5 exercises.

---

## Group 3 — Strategic Planning

| § | Section (slug) | Title | Exercises |
|---|---|---|---|
| 9 | `removing-obstacles-achieving-goals` | Removing Obstacles, Achieving Goals | `goal-introspection` (structured-text, **6 prompts** from :1623–1632: importance/long_term/feel_attained/feel_not/chances/if_fail — reshaped from legacy `goal-achievement-plan`), `removing-obstacles` (structured-text, **~64 prompts** per :1669–1697 × 8 goals — IDs `goalN_personal_M` and `goalN_world_M`), `achieving-goal-actions` (structured-text, **40 prompts** per :1699–1706 × 8 goals — IDs `goalN_action_M`), `success-failure-alibis` (checkbox, :1911–2018), `declaration-of-self-esteem` (text, :2019–2043, **1 affirmation prompt — single textarea**) |

**Strategic Planning total**: 1 section, 5 exercises.

---

## Removed from the section flow

| Legacy exercise | Reason | New home |
|---|---|---|
| `copyright-footer` (info) | Duplicates `/course/complete` page content | `CourseClosing.tsx` (already renders the same content) |

---

## Workbook citations not yet placed

The following passages from `psp_content.md` are reference material that frames sections but does not become an exercise:

| Lines | Content | Disposition |
|---|---|---|
| 60–115 | "Today's Work Environment", PSP Model overview | `framing.introduction` slot on the first slide of `personality` (per Iter 4 framing) |
| 116–219 | Intro chapters | Move to `/about` or `/onboarding` (out of scope this iter) |
| 220–299 | Welcome, overview of 6 hours | Already on `/course` home framing or `CourseHome.tsx` (verify) |
| 1224–1239 | Real Life Stories (Zoran, Baldur & Rani) | `framing.testimonial_blockquote` slot in section closing slides (per Iter 4) |
| 2044–2098 | Congratulations, About Compass / Sam Koshy, Other books | `/course/complete` page (already renders) |

---

## Question-prompt count rule (FR-010 enforcement matrix)

| Exercise (new slug) | Mandatory workbook prompts | `questions[].length` | `combined`? |
|---|---|---|---|
| `top-three-values` | 3 | 3 | no |
| `past-experience-inventory` | TBD (R9 audit) | = audit | no |
| `contract-with-myself` | 6 | 6 | no |
| `mission-statement` | 5 | 5 | no |
| `visualization-journal` | 4 | 4 | no |
| `goal-introspection` | 6 | 6 | no |
| `removing-obstacles` | ~64 | 64 | no |
| `achieving-goal-actions` | 40 | 40 | no |
| `favorite-strongest-skills` | TBD (R9 audit) | = audit | no |
| `attitude-power-points` | TBD (R9 audit) | = audit (likely promote text→structured-text) | no |
| `my-core-style` | 1 | n/a (single `text`) | n/a |
| `life-line-exercise` | 1 (drawing) | n/a (single `text`) | n/a |
| `declaration-of-self-esteem` | 1 (affirmation) | n/a (single `text`) | n/a |

**Expected `combined: true` count**: zero. If any exercise emerges from authoring with `combined: true`, it MUST be justified inline and reviewed in the IP review pass.

---

## IP review checkpoints

Every row below MUST have its workbook citation re-verified by the IP reviewer before the seed migration commits (task `T-IP4-001` in `tasks.md`):

- All **new** exercises: `visualization-practice`, `visualization-journal`, `goal-introspection`, `removing-obstacles`, `achieving-goal-actions`
- All **reshaped** exercises (prompt strings authored from workbook): every entry in the "Question-prompt count rule" table above
- All **renamed-section** exercises must keep their original `attribution` field intact

The `db/seeds/ip-review.md` document gets a new dated block summarizing each check.
