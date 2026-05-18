import { supabase } from '@/lib/supabase'

const GOAL_INVENTORY_GOAL_COL = 1
const GOAL_COUNT = 8

export async function fetchGoalNames(
  participantId: string,
  sessionId: string | null | undefined
): Promise<string[]> {
  const { data: exercises } = await supabase
    .from('exercises')
    .select('id, slug')
    .in('slug', ['goal-priorities', 'life-goal-inventory'])

  if (!exercises || exercises.length < 2) return Array<string>(GOAL_COUNT).fill('')

  const gpEx = exercises.find((e) => e.slug === 'goal-priorities')
  const lgiEx = exercises.find((e) => e.slug === 'life-goal-inventory')
  if (!gpEx || !lgiEx) return Array<string>(GOAL_COUNT).fill('')

  let respQuery = supabase
    .from('responses')
    .select('exercise_id, response_json')
    .eq('participant_id', participantId)
    .in('exercise_id', [gpEx.id, lgiEx.id])
  respQuery = sessionId
    ? respQuery.eq('session_id', sessionId)
    : respQuery.is('session_id', null)
  const { data: resps } = await respQuery

  const respMap: Record<string, unknown> = {}
  for (const r of resps ?? []) respMap[r.exercise_id] = r.response_json

  const gpResp = respMap[gpEx.id] as { order?: string[] } | undefined
  const lgiResp = respMap[lgiEx.id] as { rows?: string[][] } | undefined

  if (!gpResp?.order || !lgiResp?.rows) return Array<string>(GOAL_COUNT).fill('')

  const goalMap: Record<string, string> = {}
  lgiResp.rows.forEach((row, rowIdx) => {
    const label = (row[GOAL_INVENTORY_GOAL_COL] ?? '').trim()
    if (label) goalMap[`goal_row_${rowIdx}`] = label
  })

  const names = gpResp.order.slice(0, GOAL_COUNT).map((id) => goalMap[id] ?? '')
  while (names.length < GOAL_COUNT) names.push('')
  return names
}
