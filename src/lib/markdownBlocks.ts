// 006-iter6 / Phase 2 (T005): shared block-aware parser extracted from
// InfoExercise so TextExercise (and any future renderer) can reuse it.
//
// Contract: specs/006-iter6-personality-watusi-polish/contracts/text-prompt-parser.md

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'br' }
  | { kind: 'ol'; items: string[] }
  | { kind: 'ul'; items: string[] }

export const NUMBERED = /^\s*\d+\.\s+(.*)$/
export const BULLET = /^\s*[•\-*]\s+(.*)$/

export function parseBlocks(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  for (const raw of lines) {
    const line = raw
    if (line === '') {
      blocks.push({ kind: 'br' })
      continue
    }
    const numMatch = line.match(NUMBERED)
    const bulMatch = !numMatch ? line.match(BULLET) : null

    const last = blocks[blocks.length - 1]
    if (numMatch) {
      if (last && last.kind === 'ol') last.items.push(numMatch[1])
      else blocks.push({ kind: 'ol', items: [numMatch[1]] })
    } else if (bulMatch) {
      if (last && last.kind === 'ul') last.items.push(bulMatch[1])
      else blocks.push({ kind: 'ul', items: [bulMatch[1]] })
    } else {
      blocks.push({ kind: 'p', text: line })
    }
  }
  return blocks
}
