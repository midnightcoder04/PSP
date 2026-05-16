# IP Compliance Review: PSP Course Content

**Date**: 2026-05-04
**Reviewer**: T012 compliance task
**Source**: psp_content.md

This document lists every attribution line, trademark, and "adapted with permission" text
from `psp_content.md` that MUST be preserved verbatim in any rendered output, seeded exercise
content, or user-facing surface of the platform.

---

## 1. Trademarks & Brand Names (MUST appear as-is)

| Mark | Context | MUST appear in |
|---|---|---|
| `Personal Strategic Planning™` | Title, headings, body references | All course section headers, about pages |
| `PSP™` | Shortened form | Navigation, progress labels |
| `Whole Person Management™` | Sam Koshy product (do not alter) | About/credits page |
| `Compass Career Life Solutions` | Author's company | Credits/footer |
| `Compass Solutions' Personal Strategic Planning™ Model` | Full product name | Model diagram, intro section |

## 2. Copyright Notice (MUST appear verbatim in footer or credits)

```
© Sam Koshy / Compass Career Life Solutions, Canada. All rights reserved.
Workshop facilitated by Bijo Abraham (Career & Life Strategist), Select HR Solutions.
share@risewithpsp.com | +91 971 840 2480
```

*Source: psp_content.md lines 2096–2098*

## 3. D.I.S.C. Attribution (MUST appear in Personality section)

```
THE D.I.S.C. MODEL was developed by Bill Bonnstetter at Target Training International,
Phoenix, Arizona. It is based on the psychology of Carl Jung and William Moulton Marston
and is widely accepted as an effective tool for enhancing performance in all areas of life.
```

*Source: psp_content.md line 346*

## 4. "Adapted with Permission" Lines (MUST appear inline with relevant exercises)

```
(Adapted with permission from How To Read and Understand People
Copyright 1988 Target Training International)
```

*Source: psp_content.md lines 368 and 659 — appears after D.I.S.C.-related exercises in
the Personality section. Must be shown as `attribution` field in those exercise rows.*

## 5. Bill Bonnstetter Quote Attribution

Any Bill Bonnstetter quotes extracted from psp_content.md MUST carry the attribution:
`— Bill Bonnstetter`

*Source: psp_content.md lines 338 and 362*

## 6. Author Credits (MUST appear on About/credits page)

```
Sam Koshy
Creator and Author of Personal Strategic Planning™
Compass Career Life Solutions, Canada

Workshop facilitated by:
Bijo Abraham (Career & Life Strategist)
Select HR Solutions
share@risewithpsp.com | +91 971 840 2480
```

## 7. Seed Implementation Requirements

When populating `exercises.attribution`:
- All D.I.S.C. assessment exercises MUST have:
  `(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)`
- The global copyright block MUST be stored in an `info` exercise at the end of each section
  OR rendered in a persistent platform footer.
- No PSP™ or Compass Career Life Solutions content may be served to unauthenticated users
  (enforced by RLS on `exercises` and `sections` tables).

## 8. Scope of Authorization

Per CLAUDE.md: The workshop is **adapted and facilitated** (not owned) by Bijo Abraham /
Select HR Solutions. Content is used under arrangement with Sam Koshy / Compass Career Life
Solutions. The platform MUST NOT represent Bijo Abraham as the author or creator of the PSP
framework.

---

## 9. Iteration 5 (004-content-restructure) IP Review — 2026-05-16

**Reviewer**: Claude Code (drafting), pending facilitator sign-off
**Scope**: Restructure into three groups / nine sections / per-question answer fields. Migration 014 applied to live project (okedskadkspeiyxjslqc) — section count 6 → 9; exercise count 30 → 33.

### 9.1 New exercises authored from `psp_content.md` (verbatim where required)

| Section | Exercise | Workbook source | Attribution preserved | Notes |
|---|---|---|---|---|
| visualization | `visualization-practice` (info) | psp_content.md:1598–1615 | ✓ "Personal Strategic Planning™ — © Sam Koshy / Compass Career Life Solutions, Canada." | 9 bullet-pointed visualization steps + daily-practice closing paragraph reproduced verbatim. |
| visualization | `visualization-journal` (structured-text, 4 q) | psp_content.md:1607–1611 (introspective prompts implicit in workbook) | ✓ same as above | Four reflection prompts drafted to surface what the participant saw in the visualization; IDs `what_seen`, `who_present`, `place_details`, `one_action`. |
| removing-obstacles-achieving-goals | `goal-introspection` (structured-text, 6 q) | psp_content.md:1623–1632 | ✓ Compass / Sam Koshy | Six mandatory reflection prompts (importance, long_term, feel_attained, feel_not, chances, if_fail) asked once for all 8 goals in aggregate per research.md R5 (workbook intends one reflection pass). |
| removing-obstacles-achieving-goals | `removing-obstacles` (structured-text, 64 q) | psp_content.md:1669–1697 × 8 goals | ✓ Compass / Sam Koshy | 8 goals × 8 prompts (4 personal + 4 world). Drops the workbook's obstacle→action mapping table; paired with `achieving-goal-actions` per research.md R5. |
| removing-obstacles-achieving-goals | `achieving-goal-actions` (structured-text, 40 q) | psp_content.md:1699–1706 × 8 goals | ✓ Compass / Sam Koshy | 8 goals × 5 concrete-action prompts. |

### 9.2 Reshaped / renamed exercises

| Exercise | Change | Source | Notes |
|---|---|---|---|
| `top-three-values` | Promoted `text` → `structured-text` (3 prompts) | psp_content.md:918–924 | IDs `top_1`, `top_2`, `top_3`. Per-question contract (FR-010) satisfied. |
| `favorite-strongest-skills` | Promoted `text` → `structured-text` (6 prompts) | psp_content.md:1341–1369 | IDs `skill_1`..`skill_6`. Workbook explicitly numbers 6 separate prompts. |
| `past-experience-inventory` | `label` → `prompt` rename on 14 questions | psp_content.md:1058–1144 | No prompt-count change; existing IDs `q1`..`q14` preserved. |
| `contract-with-myself` | `label` → `prompt` rename on 6 questions | psp_content.md:1146–1188 | IDs `article_1`..`article_6` preserved. |
| `mission-statement` | `label` → `prompt` rename on 5 questions | psp_content.md:1190–1222 | IDs `vision`, `self`, `others`, `world`, `one_sentence` preserved. |
| `goal-achievement-plan` | Reshaped into `goal-introspection` | (see 9.1) | Renamed and trimmed from 10 questions to 6 mandatory reflection prompts. |
| `attitude-power-points` | Audited; kept as `text` (1 reflection prompt) | psp_content.md:810–832 | Workbook 6 "Power Points" are declarative statements about attitudes, not 6 separate questions; existing single-prompt reflection summarising them is the correct shape. R9 audit decision documented. |
| `transferable-skills-information` | Audited; kept as merged `rating-picker` | psp_content.md:1299–1339 | Workbook framing combines Gather + Manage + Store into one rated skill set; splitting would lose the workbook's intent. R9 audit decision documented. |

### 9.3 Section slug renames (FR-009)

| Old slug | New slug | Title change |
|---|---|---|
| `attitudes` | `attitude` | "Attitudes" → "Attitude" |
| `roles` | `roles-and-demands` | "Roles & Their Demands" → "Roles and Demands" |
| `skills` | `transferable-skills` | "Transferable Skills" → "Transferable Marketable Skills" |
| `goal-setting` | — (dissolved into 4 new sections) | — |

### 9.4 Removed from section flow

| Legacy exercise | Reason | New home |
|---|---|---|
| `copyright-footer` (info) | Duplicates `CourseClosing.tsx` on `/course/complete` | `/course/complete` page (no code change needed; already renders equivalent content). |

### 9.5 Attribution preservation audit (FR-020)

All `attribution` strings from the legacy seed are preserved verbatim on the corresponding new exercise (by content equivalence). Newly authored exercises (`visualization-practice`, `visualization-journal`, `goal-introspection`, `removing-obstacles`, `achieving-goal-actions`) carry the canonical Compass / Sam Koshy attribution string. The TTI attribution remains on all D.I.S.C. and attitude-related exercises.

### 9.6 Sign-off

- [x] Workbook line ranges verified against `psp_content.md` (state at 2026-05-16).
- [x] Attribution lines preserved verbatim on all retained exercises.
- [x] New exercises carry appropriate Compass / Sam Koshy attribution.
- [x] No PSP™ trademark altered, removed, or relocated.
- [ ] Facilitator (Bijo Abraham) sign-off pending — to be obtained out-of-band before public participant rollout.

---

## 10. Iteration 5 review block — Personality two-question quiz + DISC read-throughs (`005-iter5-ux-fixes`)

**Review date**: 2026-05-16
**Reviewer initials**: Bijo Abraham (facilitator) — sign-off pending out-of-band confirmation; technical review by automation 2026-05-16
**Scope**: Personality section content reshape (migration 015). All other sections unchanged.

### 10.1 Rows removed from Personality (5)

| slug | workbook source removed | reason |
|---|---|---|
| `identifying-personal-style` | `psp_content.md:366–434` (quick D/I/S/C self-rate) | Superseded by the two-question Core Style quiz per `psp_content.md:408–432` |
| `disc-core-style-d` | `psp_content.md:468–536` (HIGH D checklist) | Re-rendered as a read-through `info` exercise (`disc-profile-d`) per spec FR-052 |
| `disc-core-style-i` | `psp_content.md:540–614` (HIGH I checklist) | Re-rendered as `disc-profile-i` |
| `disc-core-style-s` | `psp_content.md:618–680` (HIGH S checklist) | Re-rendered as `disc-profile-s` |
| `disc-core-style-c` | `psp_content.md:684–747` (HIGH C checklist) | Re-rendered as `disc-profile-c` |

### 10.2 Rows added to Personality (7)

| slug | workbook source | type | attribution |
|---|---|---|---|
| `core-style-q1-extroversion` | `psp_content.md:414` (Q1) | checkbox (`allow_multiple: false`) | TTI — verbatim |
| `core-style-q2-orientation` | `psp_content.md:415` (Q2) | checkbox (`allow_multiple: false`) | TTI — verbatim |
| `core-style-result` | `psp_content.md:417–432` (Core Style mapping table) | info (computed) | TTI — verbatim |
| `disc-profile-d` | `psp_content.md:468–536` | info (read-through prose) | TTI — verbatim |
| `disc-profile-i` | `psp_content.md:540–614` | info (read-through prose) | TTI — verbatim |
| `disc-profile-s` | `psp_content.md:618–680` | info (read-through prose) | TTI — verbatim |
| `disc-profile-c` | `psp_content.md:684–747` | info (read-through prose) | TTI — verbatim |

(`TTI` = `(Adapted with permission from How To Read and Understand People Copyright 1988 Target Training International)`)

### 10.3 Rows preserved (2)

| slug | change |
|---|---|
| `disc-introduction` | `slide_group` 1 (was NULL); `content_json` byte-identical |
| `my-core-style` | `order_index` 7 → 9, `slide_group` NULL → 6; `type='text'`, `attribution: null`, `is_scored: false` all preserved; `content_json` byte-identical (single-textarea reflection) |

### 10.4 Attribution preservation audit (SC-IP-1)

- All seven newly authored info / checkbox rows carry the TTI attribution string verbatim.
- The preserved row `my-core-style` retains its existing `attribution: null` — this is a participant reflection prompt, not adapted content, and was never attributed in the legacy seed.
- The preserved row `disc-introduction` retains its TTI attribution verbatim.
- SQL invariant `015_personality_exercises_invariants.sql §IP-attribution invariant (SC-IP-1)` asserts the above programmatically.

### 10.5 Sign-off

- [x] Workbook line ranges verified against `psp_content.md` (state at 2026-05-16).
- [x] TTI attribution string preserved verbatim on every adapted row.
- [x] No PSP™ trademark altered, removed, or relocated.
- [x] D.I.S.C. credit (Bill Bonnstetter / Target Training International) preserved on all DISC-derived rows.
- [ ] Facilitator (Bijo Abraham) sign-off pending — to be obtained out-of-band before public participant rollout.
