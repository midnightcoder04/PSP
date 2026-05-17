#!/usr/bin/env python3
"""
One-shot seed regenerator for Iteration 5 (004-content-restructure).

Loads db/seeds/course-content.json, applies the IA restructure + per-question
contract per specs/004-content-restructure/contracts/group-section-mapping.md,
and writes the result back. Idempotent — re-running it produces identical output.

This is a dev helper, not a runtime dependency. After Iter 5 ships, the seed
JSON becomes the source of truth; this script lives on for traceability and
in case a future iter needs to regenerate from psp_content.md.
"""

import json
import sys
from pathlib import Path

SEED_PATH = Path("db/seeds/course-content.json")


# ──────────────────────────────────────────────────────────────────────
# Phase 5 — per-question contract: convert legacy `label` to `prompt`
# ──────────────────────────────────────────────────────────────────────

def relabel_questions(exercise):
    """Renames question.label -> question.prompt; preserves placeholder/lengths."""
    cj = exercise.get("content_json")
    if not cj or "questions" not in cj:
        return exercise
    new_questions = []
    for q in cj["questions"]:
        new_q = dict(q)
        if "label" in new_q and "prompt" not in new_q:
            new_q["prompt"] = new_q.pop("label")
        if "required" not in new_q:
            new_q["required"] = True
        new_questions.append(new_q)
    cj["questions"] = new_questions
    # Move top-level `prompt` (preamble) into `intro` per the new contract.
    if "prompt" in cj and "intro" not in cj:
        cj["intro"] = cj.pop("prompt")
    return exercise


# ──────────────────────────────────────────────────────────────────────
# New exercises authored from psp_content.md (verbatim where required)
# ──────────────────────────────────────────────────────────────────────

VISUALIZATION_PRACTICE_BODY = (
    "Research has shown that every thought we think has an affect on the chemistry "
    "of our bodies. By visualizing goal attainment, we actually increase our "
    "motivation to achieve them.\n\n"
    "**The next exercise will show you how visualization will help you in "
    "achieving your goals:**\n\n"
    "- Stand up.\n"
    "- Take a deep breath and let it out slowly.\n"
    "- Repeat two or three times. If you know other body relaxation exercises, do them now.\n"
    "- Once you are relaxed, close your eyes, get comfortable, and go to a place called "
    "the \"hallways of your mind\". This is a limitless place with an infinite number of "
    "rooms and spaces. Can you see it? Find the place that has to do with achieving all "
    "8 of your goals.\n"
    "- Visualize yourself having achieved all 8 of these goals.\n"
    "- Take note of your posture in this situation. Note your breathing pattern and how "
    "your muscles feel. Are they tense, relaxed, alert?\n"
    "- Take note if there is anyone else with you in this place. Who are they? What are "
    "their posture and facial expressions? How are they relating to you?\n"
    "- Note everything around you in this place, including colours, sounds, textures, "
    "smells and tastes. Recognize that you can go to this place any time. And that you "
    "can change anything at any time.\n"
    "- Now take a deep breath and blow it out as if you were blowing out a candle.\n"
    "- Open your eyes and take a moment to reorientate yourself to where you are.\n\n"
    "Do this exercise at least once a day, twice if you can. The best times are in the "
    "morning when you first wake up and at night as you're dozing off to sleep. Go to "
    "this place any time you are under stress or have lost track of where you're going "
    "and what you are doing in your life. Some find it helpful to use a picture that "
    "represents their future achievements. Whether you buy one or draw one yourself, a "
    "concrete visual representation can be very powerful."
)


def visualization_practice():
    return {
        "slug": "visualization-practice",
        "title": "The Importance of Visualization",
        "type": "info",
        "order_index": 1,
        "is_scored": False,
        "attribution": "Personal Strategic Planning™ — © Sam Koshy / Compass Career Life Solutions, Canada.",
        "content_json": {
            "content": VISUALIZATION_PRACTICE_BODY,
        },
    }


def visualization_journal():
    return {
        "slug": "visualization-journal",
        "title": "Visualization Journal",
        "type": "structured-text",
        "order_index": 2,
        "is_scored": False,
        "attribution": "Personal Strategic Planning™ — © Sam Koshy / Compass Career Life Solutions, Canada.",
        "content_json": {
            "intro": "After completing the visualization practice above, record what you experienced. Return to this journal each time you repeat the practice — your answers will deepen and shift over the weeks ahead.",
            "questions": [
                {"id": "what_seen", "prompt": "What did you see in the place that has to do with achieving all 8 of your goals? Describe the scene as vividly as you can.", "required": True, "max_length": 1500, "min_length": 20},
                {"id": "who_present", "prompt": "Who else was with you in this place? What were their posture and facial expressions, and how were they relating to you?", "required": True, "max_length": 1200, "min_length": 20},
                {"id": "place_details", "prompt": "Note everything around you — colours, sounds, textures, smells, tastes. What stood out?", "required": True, "max_length": 1200, "min_length": 20},
                {"id": "one_action", "prompt": "Name one concrete action you can take this week, drawn from what you saw, that moves you closer to your future self.", "required": True, "max_length": 800, "min_length": 20},
            ],
        },
    }


def goal_introspection():
    """6 reflection prompts from psp_content.md:1623–1632, asked once for all 8 goals
    in aggregate per research.md R5 (workbook intends one reflection pass, not eight)."""
    return {
        "slug": "goal-introspection",
        "title": "Goal Achievement Plan — Reflection",
        "type": "structured-text",
        "order_index": 1,
        "is_scored": False,
        "attribution": "Personal Strategic Planning™ — © Sam Koshy / Compass Career Life Solutions, Canada.",
        "content_json": {
            "intro": "Think about each of your top eight goals together as a single Personal Strategic Plan. Answer each of the six questions below. Take into account the outside influences that affect your decisions and plans.",
            "questions": [
                {"id": "importance", "prompt": "How important is it that you achieve these goals? Why now?", "required": True, "max_length": 1500, "min_length": 30},
                {"id": "long_term", "prompt": "How do these goals relate to your long-term goals? What conflicts are there between them?", "required": True, "max_length": 1500, "min_length": 30},
                {"id": "feel_attained", "prompt": "How will you feel when you attain these goals? Try to imagine yourself with the goals achieved — what are your feelings?", "required": True, "max_length": 1500, "min_length": 30},
                {"id": "feel_not", "prompt": "How will you feel if you do not attain these goals? Try to imagine again — what are your feelings?", "required": True, "max_length": 1500, "min_length": 30},
                {"id": "chances", "prompt": "What do you think about your chances of succeeding? What will happen if you do succeed?", "required": True, "max_length": 1500, "min_length": 30},
                {"id": "if_fail", "prompt": "What will happen if you fail at one or more of these goals?", "required": True, "max_length": 1500, "min_length": 30},
            ],
        },
    }


def removing_obstacles():
    """Per-goal × 8 goals: 4 personal-shortcomings + 4 world-obstacles = 64 prompts.
    Source: psp_content.md:1669–1697 × 8 goals."""
    questions = []
    for goal_n in range(1, 9):
        for m in range(1, 5):
            questions.append({
                "id": f"goal{goal_n}_personal_{m}",
                "prompt": f"Goal {goal_n} — personal shortcoming #{m} that will keep you from achieving this goal.",
                "required": True,
                "max_length": 400,
                "min_length": 5,
            })
        for m in range(1, 5):
            questions.append({
                "id": f"goal{goal_n}_world_{m}",
                "prompt": f"Goal {goal_n} — obstacle in the world #{m} that will keep you from achieving this goal.",
                "required": True,
                "max_length": 400,
                "min_length": 5,
            })
    assert len(questions) == 64, f"expected 64 prompts, got {len(questions)}"
    return {
        "slug": "removing-obstacles",
        "title": "Removing Obstacles — Per Goal",
        "type": "structured-text",
        "order_index": 2,
        "is_scored": False,
        "attribution": "Personal Strategic Planning™ — © Sam Koshy / Compass Career Life Solutions, Canada.",
        "content_json": {
            "intro": "For each of your top 8 goals, name up to 4 personal shortcomings and up to 4 external obstacles that could keep you from achieving it. You need not eliminate the block entirely — anything you can do to lessen its force will start you moving toward your goal.",
            "questions": questions,
        },
    }


def achieving_goal_actions():
    """Per-goal × 8 goals: 5 concrete actions = 40 prompts.
    Source: psp_content.md:1699–1706 × 8 goals."""
    questions = []
    for goal_n in range(1, 9):
        for m in range(1, 6):
            questions.append({
                "id": f"goal{goal_n}_action_{m}",
                "prompt": f"Goal {goal_n} — specific action #{m} you can take that will move you toward this goal.",
                "required": True,
                "max_length": 400,
                "min_length": 5,
            })
    assert len(questions) == 40, f"expected 40 prompts, got {len(questions)}"
    return {
        "slug": "achieving-goal-actions",
        "title": "Achieving Goals — Specific Actions",
        "type": "structured-text",
        "order_index": 3,
        "is_scored": False,
        "attribution": "Personal Strategic Planning™ — © Sam Koshy / Compass Career Life Solutions, Canada.",
        "content_json": {
            "intro": "For each of your top 8 goals, list 5 specific things you can do that will move you toward this goal. These should be concrete actions, not statements of intent.",
            "questions": questions,
        },
    }


# ──────────────────────────────────────────────────────────────────────
# Phase 5 promotions: text → structured-text
# ──────────────────────────────────────────────────────────────────────

def promoted_top_three_values(legacy):
    """Promote `top-three-values` (text) → structured-text with 3 prompts.
    psp_content.md:918–924."""
    return {
        "slug": "top-three-values",
        "title": legacy.get("title", "My Top Three Values"),
        "type": "structured-text",
        "order_index": legacy.get("order_index", 3),
        "is_scored": False,
        "attribution": legacy.get("attribution"),
        "content_json": {
            "intro": "Based on the Values Shopping Spree exercise, list your top three values (those you spent the most money on) and reflect on how each one shows up as a driving force in your life. How do these values influence your career choices, relationships, and daily decisions?",
            "questions": [
                {"id": "top_1", "prompt": "My #1 top value is ___ — describe how it shows up as a driving force in your life, career, and relationships.", "required": True, "max_length": 800, "min_length": 30},
                {"id": "top_2", "prompt": "My #2 top value is ___ — describe how it shows up as a driving force in your life, career, and relationships.", "required": True, "max_length": 800, "min_length": 30},
                {"id": "top_3", "prompt": "My #3 top value is ___ — describe how it shows up as a driving force in your life, career, and relationships.", "required": True, "max_length": 800, "min_length": 30},
            ],
        },
    }


def promoted_favorite_strongest_skills(legacy):
    """Promote `favorite-strongest-skills` (text) → structured-text with 6 prompts.
    psp_content.md:1341–1369."""
    return {
        "slug": "favorite-strongest-skills",
        "title": legacy.get("title", "My Favorite & Strongest Skills"),
        "type": "structured-text",
        "order_index": legacy.get("order_index", 4),
        "is_scored": False,
        "attribution": legacy.get("attribution"),
        "content_json": {
            "intro": "List your top six favorite AND strongest skills. Remember — favorite AND strongest, not just strongest. Feel free to add any skills not found in the previous exercise. Your passions matter here as much as your proficiency.",
            "questions": [
                {"id": "skill_1", "prompt": "My favorite and strongest skill is:", "required": True, "max_length": 400, "min_length": 5},
                {"id": "skill_2", "prompt": "My second favorite and strongest skill is:", "required": True, "max_length": 400, "min_length": 5},
                {"id": "skill_3", "prompt": "My third favorite and strongest skill is:", "required": True, "max_length": 400, "min_length": 5},
                {"id": "skill_4", "prompt": "My fourth favorite and strongest skill is:", "required": True, "max_length": 400, "min_length": 5},
                {"id": "skill_5", "prompt": "My fifth favorite and strongest skill is:", "required": True, "max_length": 400, "min_length": 5},
                {"id": "skill_6", "prompt": "My sixth favorite and strongest skill is:", "required": True, "max_length": 400, "min_length": 5},
            ],
        },
    }


# ──────────────────────────────────────────────────────────────────────
# Group → Section mapping
# ──────────────────────────────────────────────────────────────────────

SECTION_DEFINITIONS = [
    # (new_slug, new_title, group_slug, order_index, source_slug_in_legacy_seed)
    ("personality",                        "Personality",                            "self-awareness",    1, "personality"),
    ("attitude",                           "Attitude",                               "self-awareness",    2, "attitudes"),
    ("values",                             "Values",                                 "self-awareness",    3, "values"),
    ("roles-and-demands",                  "Roles and Demands",                      "self-awareness",    4, "roles"),
    ("transferable-skills",                "Transferable Marketable Skills",         "self-awareness",    5, "skills"),
    ("specific-goals",                     "Specific Goals",                         "goal-setting",      6, None),
    ("goal-impact-matrix",                 "Goal Impact Matrix",                     "goal-setting",      7, None),
    ("visualization",                      "Visualization",                          "goal-setting",      8, None),
    ("removing-obstacles-achieving-goals", "Removing Obstacles, Achieving Goals",    "strategic-planning", 9, None),
]


def find_exercise(legacy_sections, section_slug, exercise_slug):
    for s in legacy_sections:
        if s["slug"] != section_slug:
            continue
        for e in s.get("exercises", []):
            if e["slug"] == exercise_slug:
                return e
    raise KeyError(f"could not find {section_slug}/{exercise_slug} in legacy seed")


def regenerate(legacy_seed):
    legacy_sections = legacy_seed["sections"]
    new_sections = []

    for new_slug, new_title, group_slug, order_idx, source_slug in SECTION_DEFINITIONS:
        framing = None  # default for new sections without a legacy source
        if new_slug == "personality":
            src = next(s for s in legacy_sections if s["slug"] == "personality")
            exercises = [dict(e) for e in src["exercises"]]
            framing = src.get("framing")
        elif new_slug == "attitude":
            src = next(s for s in legacy_sections if s["slug"] == "attitudes")
            exercises = [dict(e) for e in src["exercises"]]
            framing = src.get("framing")
            # Phase 5 R9 audit: attitude-power-points stays as `text` (workbook 810-832
            # presents 6 declarative "Power Points," not 6 separate questions; the
            # existing single-prompt text reflection summarising them is appropriate).
        elif new_slug == "values":
            src = next(s for s in legacy_sections if s["slug"] == "values")
            exercises = []
            for e in src["exercises"]:
                if e["slug"] == "top-three-values":
                    exercises.append(promoted_top_three_values(e))
                else:
                    exercises.append(dict(e))
            framing = src.get("framing")
        elif new_slug == "roles-and-demands":
            src = next(s for s in legacy_sections if s["slug"] == "roles")
            exercises = []
            for e in src["exercises"]:
                exercises.append(relabel_questions(dict(e)))
            framing = src.get("framing")
        elif new_slug == "transferable-skills":
            src = next(s for s in legacy_sections if s["slug"] == "skills")
            exercises = []
            for e in src["exercises"]:
                if e["slug"] == "favorite-strongest-skills":
                    exercises.append(promoted_favorite_strongest_skills(e))
                else:
                    exercises.append(dict(e))
            framing = src.get("framing")
            # R9 audit: transferable-skills-information stays merged as a single
            # rating-picker per the workbook's combined "Gather + Manage + Store"
            # framing (psp_content.md:1299–1339). Documented in ip-review.md.
        elif new_slug == "specific-goals":
            life_inv = find_exercise(legacy_sections, "goal-setting", "life-goal-inventory")
            priorities = find_exercise(legacy_sections, "goal-setting", "goal-priorities")
            exercises = [
                {**dict(life_inv), "order_index": 1},
                {**dict(priorities), "order_index": 2},
            ]
        elif new_slug == "goal-impact-matrix":
            cim = find_exercise(legacy_sections, "goal-setting", "cross-impact-matrix")
            exercises = [{**dict(cim), "order_index": 1}]
        elif new_slug == "visualization":
            exercises = [visualization_practice(), visualization_journal()]
        elif new_slug == "removing-obstacles-achieving-goals":
            sfa = find_exercise(legacy_sections, "goal-setting", "success-failure-alibis")
            dose = find_exercise(legacy_sections, "goal-setting", "declaration-of-self-esteem")
            exercises = [
                goal_introspection(),
                removing_obstacles(),
                achieving_goal_actions(),
                {**dict(sfa), "order_index": 4},
                {**dict(dose), "order_index": 5},
            ]
        else:
            raise RuntimeError(f"no handler for {new_slug}")

        new_sections.append({
            "slug": new_slug,
            "title": new_title,
            "subtitle": None,
            "description": None,
            "order_index": order_idx,
            "group_slug": group_slug,
            "icon_name": None,
            "framing": framing,
            "exercises": exercises,
        })

    return {"sections": new_sections}


def main():
    if not SEED_PATH.exists():
        print(f"missing {SEED_PATH}", file=sys.stderr)
        sys.exit(1)
    legacy = json.loads(SEED_PATH.read_text())
    new_seed = regenerate(legacy)
    SEED_PATH.write_text(json.dumps(new_seed, indent=2) + "\n")
    section_count = len(new_seed["sections"])
    exercise_count = sum(len(s["exercises"]) for s in new_seed["sections"])
    q_count = 0
    for s in new_seed["sections"]:
        for e in s["exercises"]:
            cj = e.get("content_json") or {}
            q_count += len(cj.get("questions") or [])
    print(f"regenerated {SEED_PATH}: {section_count} sections, {exercise_count} exercises, {q_count} question prompts")


if __name__ == "__main__":
    main()
