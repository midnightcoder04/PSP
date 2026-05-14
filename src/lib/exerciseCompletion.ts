import type {
  Exercise,
  StructuredTextContent,
  StructuredTextResponse,
  RatingPickerContent,
  RatingPickerResponse,
} from '@/types/database'

export function isStructuredTextComplete(
  content: StructuredTextContent,
  response: StructuredTextResponse | null | undefined
): boolean {
  if (!response?.answers) return false
  return content.questions.every((q) => {
    const answer = response.answers[q.id]?.trim() ?? ''
    return answer.length >= (q.min_length ?? 1)
  })
}

export function isRatingPickerComplete(
  content: RatingPickerContent,
  response: RatingPickerResponse | null | undefined
): boolean {
  if (!response?.ratings) return false
  const { min, max } = content.scale
  return content.items.every((item) => {
    const rating = response.ratings[item.id]
    return typeof rating === 'number' && rating >= min && rating <= max
  })
}

export function slideIndexForExercise(
  exerciseId: string | null | undefined,
  groupedExercises: Exercise[][]
): number {
  if (!exerciseId) return -1
  for (let i = 0; i < groupedExercises.length; i++) {
    if (groupedExercises[i].some((ex) => ex.id === exerciseId)) {
      return i
    }
  }
  return -1
}

/**
 * Group exercises by slide_group (falling back to order_index when null).
 * Returns groups sorted by their effective key (ascending).
 */
export function groupExercisesBySlide(exercises: Exercise[]): Exercise[][] {
  const map = new Map<number, Exercise[]>()
  for (const ex of exercises) {
    const key = ex.slide_group ?? ex.order_index
    const list = map.get(key) ?? []
    list.push(ex)
    map.set(key, list)
  }
  const sortedKeys = Array.from(map.keys()).sort((a, b) => a - b)
  return sortedKeys.map((k) => {
    const group = map.get(k)!
    group.sort((a, b) => a.order_index - b.order_index)
    return group
  })
}
