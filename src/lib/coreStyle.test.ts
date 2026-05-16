import { describe, it, expect } from 'vitest'
import { mapCoreStyle, resolveCoreStyleFromResponses } from './coreStyle'

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
