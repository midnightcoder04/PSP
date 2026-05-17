import { describe, it, expect } from 'vitest'
import { mapCoreStyle, resolveCoreStyleFromResponses, pickStyleBlock } from './coreStyle'

describe('mapCoreStyle', () => {
  it('Extroverted + Task → D — Dominance', () => {
    expect(mapCoreStyle({ extroversion: 'E', orientation: 'T' })).toEqual({
      letter: 'D',
      name: 'Dominance',
    })
  })

  it('Extroverted + People → I — Influence', () => {
    expect(mapCoreStyle({ extroversion: 'E', orientation: 'P' })).toEqual({
      letter: 'I',
      name: 'Influence',
    })
  })

  it('Introverted + People → S — Steadiness', () => {
    expect(mapCoreStyle({ extroversion: 'I', orientation: 'P' })).toEqual({
      letter: 'S',
      name: 'Steadiness',
    })
  })

  it('Introverted + Task → C — Compliance', () => {
    expect(mapCoreStyle({ extroversion: 'I', orientation: 'T' })).toEqual({
      letter: 'C',
      name: 'Compliance',
    })
  })

  it('returns null when extroversion is missing', () => {
    expect(mapCoreStyle({ extroversion: null, orientation: 'T' })).toBeNull()
  })

  it('returns null when orientation is missing', () => {
    expect(mapCoreStyle({ extroversion: 'E', orientation: null })).toBeNull()
  })

  it('returns null when both are missing', () => {
    expect(mapCoreStyle({ extroversion: null, orientation: null })).toBeNull()
  })
})

describe('resolveCoreStyleFromResponses', () => {
  it('resolves to D when q1=extroverted, q2=task', () => {
    expect(
      resolveCoreStyleFromResponses(
        { selected_ids: ['q1_extroverted'] },
        { selected_ids: ['q2_task'] }
      )
    ).toEqual({ letter: 'D', name: 'Dominance' })
  })

  it('resolves to S when q1=introverted, q2=people', () => {
    expect(
      resolveCoreStyleFromResponses(
        { selected_ids: ['q1_introverted'] },
        { selected_ids: ['q2_people'] }
      )
    ).toEqual({ letter: 'S', name: 'Steadiness' })
  })

  it('returns null when q1 has no selection', () => {
    expect(
      resolveCoreStyleFromResponses(
        { selected_ids: [] },
        { selected_ids: ['q2_task'] }
      )
    ).toBeNull()
  })

  it('returns null when q2 response is null', () => {
    expect(
      resolveCoreStyleFromResponses({ selected_ids: ['q1_extroverted'] }, null)
    ).toBeNull()
  })

  it('returns null when both responses are null', () => {
    expect(resolveCoreStyleFromResponses(null, null)).toBeNull()
  })

  it('returns null when a selected_id does not match the contract', () => {
    expect(
      resolveCoreStyleFromResponses(
        { selected_ids: ['unexpected'] },
        { selected_ids: ['q2_task'] }
      )
    ).toBeNull()
  })
})

describe('pickStyleBlock', () => {
  const blocks = { D: 'block-d', I: 'block-i', S: 'block-s', C: 'block-c' }

  it('E + T → returns the D block', () => {
    expect(
      pickStyleBlock(
        blocks,
        { selected_ids: ['q1_extroverted'] },
        { selected_ids: ['q2_task'] }
      )
    ).toBe('block-d')
  })

  it('E + P → returns the I block', () => {
    expect(
      pickStyleBlock(
        blocks,
        { selected_ids: ['q1_extroverted'] },
        { selected_ids: ['q2_people'] }
      )
    ).toBe('block-i')
  })

  it('I + P → returns the S block', () => {
    expect(
      pickStyleBlock(
        blocks,
        { selected_ids: ['q1_introverted'] },
        { selected_ids: ['q2_people'] }
      )
    ).toBe('block-s')
  })

  it('I + T → returns the C block', () => {
    expect(
      pickStyleBlock(
        blocks,
        { selected_ids: ['q1_introverted'] },
        { selected_ids: ['q2_task'] }
      )
    ).toBe('block-c')
  })

  it('returns null when q1 is missing', () => {
    expect(pickStyleBlock(blocks, null, { selected_ids: ['q2_task'] })).toBeNull()
  })

  it('returns null when q2 is missing', () => {
    expect(pickStyleBlock(blocks, { selected_ids: ['q1_extroverted'] }, null)).toBeNull()
  })

  it('works with object-typed blocks (e.g. option-list arrays)', () => {
    const arrayBlocks = {
      D: [{ id: 'd1', label: 'd-trait' }],
      I: [{ id: 'i1', label: 'i-trait' }],
      S: [{ id: 's1', label: 's-trait' }],
      C: [{ id: 'c1', label: 'c-trait' }],
    }
    expect(
      pickStyleBlock(
        arrayBlocks,
        { selected_ids: ['q1_introverted'] },
        { selected_ids: ['q2_people'] }
      )
    ).toEqual([{ id: 's1', label: 's-trait' }])
  })
})
