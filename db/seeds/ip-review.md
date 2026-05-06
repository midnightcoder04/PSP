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
