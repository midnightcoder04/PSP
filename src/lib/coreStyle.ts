/**
 * 005-iter5-ux-fixes / US5 (FR-051): map the two-question Core Style quiz
 * answers to the participant's DISC Core Style.
 *
 *   Extroverted + Task-oriented   → D — Dominance
 *   Extroverted + People-oriented → I — Influence
 *   Introverted + People-oriented → S — Steadiness
 *   Introverted + Task-oriented   → C — Compliance
 *
 * Source: psp_content.md:417–432 (workbook mapping table).
 */

export type CoreStyleLetter = 'D' | 'I' | 'S' | 'C'

export interface CoreStyleAnswers {
  extroversion: 'E' | 'I' | null
  orientation: 'P' | 'T' | null
}

export interface CoreStyleResult {
  letter: CoreStyleLetter
  name: string
}

const NAME: Record<CoreStyleLetter, string> = {
  D: 'Dominance',
  I: 'Influence',
  S: 'Steadiness',
  C: 'Compliance',
}

export function mapCoreStyle(answers: CoreStyleAnswers): CoreStyleResult | null {
  const { extroversion, orientation } = answers
  if (extroversion == null || orientation == null) return null

  let letter: CoreStyleLetter
  if (extroversion === 'E' && orientation === 'T') letter = 'D'
  else if (extroversion === 'E' && orientation === 'P') letter = 'I'
  else if (extroversion === 'I' && orientation === 'P') letter = 'S'
  else letter = 'C' // Introverted + Task-oriented

  return { letter, name: NAME[letter] }
}

/**
 * Helper for the SectionPage `core-style-result` renderer extension:
 * inspect the participant's responses to the two upstream quiz exercises
 * and resolve their Core Style. Returns `null` if either question is
 * unanswered.
 *
 * Quiz response shape (CheckboxExercise with allow_multiple:false):
 *   { selected_ids: ['q1_extroverted'] }  // or 'q1_introverted'
 *   { selected_ids: ['q2_people'] }       // or 'q2_task'
 */
export function resolveCoreStyleFromResponses(
  q1Response: { selected_ids?: string[] } | null | undefined,
  q2Response: { selected_ids?: string[] } | null | undefined
): CoreStyleResult | null {
  const q1Id = q1Response?.selected_ids?.[0]
  const q2Id = q2Response?.selected_ids?.[0]

  const extroversion: 'E' | 'I' | null =
    q1Id === 'q1_extroverted' ? 'E' : q1Id === 'q1_introverted' ? 'I' : null
  const orientation: 'P' | 'T' | null =
    q2Id === 'q2_people' ? 'P' : q2Id === 'q2_task' ? 'T' : null

  return mapCoreStyle({ extroversion, orientation })
}
