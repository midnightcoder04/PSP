import { describe, it, expect } from 'vitest'
import { parseBlocks } from './markdownBlocks'

describe('markdownBlocks.parseBlocks', () => {
  it('TX1: two paragraphs separated by a blank line', () => {
    const blocks = parseBlocks('foo\n\nbar')
    const meaningful = blocks.filter((b) => b.kind !== 'br')
    expect(meaningful).toEqual([
      { kind: 'p', text: 'foo' },
      { kind: 'p', text: 'bar' },
    ])
  })

  it('TX2: numbered lines coalesce into a single <ol>', () => {
    const blocks = parseBlocks('1. one\n2. two')
    expect(blocks).toEqual([{ kind: 'ol', items: ['one', 'two'] }])
  })

  it('TX3: prose + numbered list + tail prose render as three blocks', () => {
    const blocks = parseBlocks('prose\n1. one\n2. two\ntail')
    expect(blocks).toEqual([
      { kind: 'p', text: 'prose' },
      { kind: 'ol', items: ['one', 'two'] },
      { kind: 'p', text: 'tail' },
    ])
  })

  it('TX4: bullet lines coalesce into a single <ul>', () => {
    const blocks = parseBlocks('• alpha\n• beta')
    expect(blocks).toEqual([{ kind: 'ul', items: ['alpha', 'beta'] }])
  })

  it('TX5: -, *, • are all treated as bullet markers', () => {
    const blocks = parseBlocks('- alpha\n* beta\n• gamma')
    expect(blocks).toEqual([
      { kind: 'ul', items: ['alpha', 'beta', 'gamma'] },
    ])
  })

  it('TX6: empty string returns no meaningful blocks', () => {
    const blocks = parseBlocks('')
    const meaningful = blocks.filter((b) => b.kind !== 'br')
    expect(meaningful).toEqual([])
  })

  it('TX7: single line renders as one paragraph', () => {
    expect(parseBlocks('hi')).toEqual([{ kind: 'p', text: 'hi' }])
  })

  it('TX8: Power-Points prompt fixture parses into p + ol + p', () => {
    const fixture =
      'Reflect on the following Attitude Power Points and write how your top two attitudes show up in your daily life, career choices, and relationships:\n' +
      '\n' +
      '1. An attitude is a way of valuing life — a world view, a paradigm of thought and action.\n' +
      "2. Most of a person's choices throughout life are guided by the hierarchy of their attitudes and needs satisfactions.\n" +
      '3. Attitudes determine our purpose and direction in life, stimulating us to action.\n' +
      '4. Attitudes are relatively constant throughout life and will usually change only in relation to a Significant Emotional Event.\n' +
      '5. Behaviour (D.I.S.C.) is the methodology for fulfilling the passions driven by our attitudes.\n' +
      '6. Attitudes tend to interact with one another.\n' +
      '\n' +
      'How do your top two attitude types interact? Do they support or conflict with each other?'
    const blocks = parseBlocks(fixture)
    const meaningful = blocks.filter((b) => b.kind !== 'br')
    expect(meaningful).toHaveLength(3)
    expect(meaningful[0].kind).toBe('p')
    expect(meaningful[1].kind).toBe('ol')
    expect(meaningful[1]).toMatchObject({ kind: 'ol' })
    if (meaningful[1].kind === 'ol') {
      expect(meaningful[1].items).toHaveLength(6)
    }
    expect(meaningful[2].kind).toBe('p')
  })

  it('TX9: blank lines are preserved as br blocks between content', () => {
    const blocks = parseBlocks('foo\n\nbar')
    expect(blocks.some((b) => b.kind === 'br')).toBe(true)
  })
})
