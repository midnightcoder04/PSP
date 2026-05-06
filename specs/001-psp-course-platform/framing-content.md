# Section Framing Content (Iteration 2 Draft)

**Feature**: 001-psp-course-platform
**Phase**: 1 — Design (Iteration 2)
**Date**: 2026-05-07
**Status**: **DRAFT — requires Bijo's IP review (T-IP2-001) before seeding**

---

## Purpose

This document is the source of truth for the per-section framing content (opening quote,
opening question, facilitator note, why-it-matters paragraph, closing reflection, bridge
to the next section) that gets seeded into the `sections.framing` JSONB column.

**Rule**: Anything that ships in the database starts in this file. The seed script copies
from here. If you want to change framing, edit this file and re-seed — never edit the
database directly.

**Tone guide**:
- Address the participant in second person ("you", not "one" or "the participant").
- Facilitator notes are written as if Bijo is reading them aloud.
- Quotes are ≤25 words and from named, widely-attributed sources. No paraphrases.
- Avoid clinical or HR-jargon language. The PSP™ workshop is warm and introspective.

---

## Section 1 · Personality (D.I.S.C.)

```jsonc
{
  "opening_quote": {
    "text": "Until you make the unconscious conscious, it will direct your life and you will call it fate.",
    "attribution": "— Carl Jung"
  },
  "opening_question": "If we asked the five people closest to you to describe how you make decisions, would they all give the same answer?",
  "facilitator_says": "D.I.S.C. isn't a label — it's a mirror. Today we're going to look at how you naturally show up, before we look at how you choose to show up.",
  "why_it_matters": "Strategy starts with self-knowledge. You can't plan a life you don't understand. Your D.I.S.C. style shapes how you make decisions, who energises you, and what kind of work feels effortless. Knowing it doesn't lock you in — it gives you a starting point.",
  "closing_reflection": "What is one D.I.S.C. trait that helps you, and one that gets in your way?",
  "bridge_to_next": "Knowing your style is one filter. Now we look at the lenses you see through it: your attitudes."
}
```

---

## Section 2 · Attitudes

```jsonc
{
  "opening_quote": {
    "text": "Between stimulus and response there is a space. In that space is our power to choose our response.",
    "attribution": "— Viktor Frankl"
  },
  "opening_question": "What is one belief you hold about yourself that you have never actually questioned?",
  "facilitator_says": "Attitudes are the lenses we look through. We rarely notice them — but they shape every decision we make.",
  "why_it_matters": "Even with the right personality and the right skills, the wrong attitude will sabotage you. The good news: attitudes can be examined, named, and chosen. We're going to surface yours so you can decide which to keep, which to soften, and which to retire.",
  "closing_reflection": "Which one attitude — if you changed it tomorrow — would change the most about your life?",
  "bridge_to_next": "Attitudes are HOW you see. Values are WHAT you protect. Let's go there next."
}
```

---

## Section 3 · Values

```jsonc
{
  "opening_quote": {
    "text": "It's not hard to make decisions when you know what your values are.",
    "attribution": "— Roy Disney"
  },
  "opening_question": "If you had to give up everything you own except five things — and not material things, but five values — what would you protect?",
  "facilitator_says": "Values aren't what we say we believe. They are what we spend on — time, energy, attention. Today we make that visible.",
  "why_it_matters": "Your values are your compass. The Goal Setting section later in this course only works if you have named which direction is north. Most people inherit their values from family, school, or workplace and never audit them. The Values Shopping Spree exercise is your audit.",
  "closing_reflection": "Which of your top five values is currently underfed?",
  "bridge_to_next": "You know your style, your lenses, your compass. Now: what hats are you actually wearing day-to-day?"
}
```

---

## Section 4 · Roles & Their Demands

```jsonc
{
  "opening_quote": {
    "text": "You can do anything, but not everything.",
    "attribution": "— David Allen"
  },
  "opening_question": "If someone made a documentary of your last 30 days, how many different characters would you play in it?",
  "facilitator_says": "We all wear multiple hats. The question isn't whether — it's whether each hat is one we still want to wear, or one we just inherited.",
  "why_it_matters": "Roles consume your hours. If you don't audit them, they will consume your life. The Life Line and Past Experience Inventory in this section help you see the shape of your time, not just the content of it. That shape is what your goals will have to fit inside.",
  "closing_reflection": "Which role on your list deserves more time than it currently gets — and which one secretly deserves less?",
  "bridge_to_next": "Roles are demands on your time. Skills are what travel with you through every role. Let's catalogue them."
}
```

---

## Section 5 · Transferable Skills

```jsonc
{
  "opening_quote": {
    "text": "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.",
    "attribution": "— Steve Jobs"
  },
  "opening_question": "What is something you do well that other people seem to find difficult?",
  "facilitator_says": "Skills aren't just job descriptions. They are patterns — and patterns travel with you wherever you go.",
  "why_it_matters": "Knowing your transferable skills means you are never trapped in one role. They are leverage. They are the answer to 'what could I do if I had to start over tomorrow?' Strategy needs options, and your skills inventory is your option set.",
  "closing_reflection": "Which one skill, if developed further, would unlock the most doors for you in the next year?",
  "bridge_to_next": "You have your style, lenses, compass, hats, and toolkit. Now we put it all together — into goals."
}
```

---

## Section 6 · Setting Goals

```jsonc
{
  "opening_quote": {
    "text": "A goal without a plan is just a wish.",
    "attribution": "— Antoine de Saint-Exupéry"
  },
  "opening_question": "If your future self — five years from now — could send you one sentence, what would it be?",
  "facilitator_says": "Now we put it together. Personality + Attitudes + Values + Roles + Skills = the lens through which you set goals that are actually yours, not someone else's.",
  "why_it_matters": "This is where Personal Strategic Planning earns its name. Everything before this was preparation. The Cross-Impact Matrix and Goal Achievement Plan exercises in this section are your blueprint for the next chapter — written by you, in your handwriting, using the self-knowledge you just built.",
  "closing_reflection": "Which goal on your list scares you the most? That one is probably the most important.",
  "bridge_to_next": null
}
```

---

## IP & attribution checklist

Before T-IP2-001 can be marked complete, Bijo must confirm:

- [ ] All six quotes are accurately attributed (no apocrypha).
- [ ] All six quotes are ≤25 words and used in transformative/educational context.
- [ ] None of the framing language conflicts with PSP™ pedagogy or Sam Koshy's intent.
- [ ] The "facilitator says" lines reflect how Bijo would actually open the section.
- [ ] The "why it matters" paragraphs are accurate to the workshop's purpose.

**If any item fails review**: edit this file, re-run `npm run db:seed`, re-test in UI.
Do not edit `db/seeds/course-content.json` directly — it is generated from this file.
