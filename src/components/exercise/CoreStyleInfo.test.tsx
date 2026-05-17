import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoreStyleInfo } from './CoreStyleInfo'
import type { CoreStyleSectionContent, Response } from '@/types/database'

const content: CoreStyleSectionContent = {
  content: "Answer the two questions above to see your matched style's content.",
  computed: 'core_style_section',
  computed_inputs: ['q1-id', 'q2-id'],
  sections_by_style: {
    D: 'If you are HIGH D, you are decisive and direct.',
    I: 'If you are HIGH I, you are expressive and enthusiastic.',
    S: 'If you are HIGH S, you are methodical and reliable.',
    C: 'If you are HIGH C, you are analytical and precise.',
  },
}

function resp(exerciseId: string, selected_ids: string[]): Response {
  return {
    id: `resp-${exerciseId}`,
    participant_id: 'user-1',
    exercise_id: exerciseId,
    session_id: null,
    response_json: { selected_ids } as Response['response_json'],
    is_complete: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('CoreStyleInfo', () => {
  it("P1: Extrovert + Task resolves to D and renders only the D block", () => {
    render(
      <CoreStyleInfo
        content={content}
        q1Response={resp('q1-id', ['q1_extroverted'])}
        q2Response={resp('q2-id', ['q2_task'])}
      />
    )
    expect(screen.getByText(/HIGH D/)).toBeInTheDocument()
    // HIGH-I / HIGH-S / HIGH-C content must NOT be in the DOM.
    expect(screen.queryByText(/HIGH I/)).not.toBeInTheDocument()
    expect(screen.queryByText(/HIGH S/)).not.toBeInTheDocument()
    expect(screen.queryByText(/HIGH C/)).not.toBeInTheDocument()
  })

  it('P1: Extrovert + People resolves to I and renders only the I block', () => {
    render(
      <CoreStyleInfo
        content={content}
        q1Response={resp('q1-id', ['q1_extroverted'])}
        q2Response={resp('q2-id', ['q2_people'])}
      />
    )
    expect(screen.getByText(/HIGH I/)).toBeInTheDocument()
    expect(screen.queryByText(/HIGH D/)).not.toBeInTheDocument()
  })

  it('P1: Introvert + People resolves to S and renders only the S block', () => {
    render(
      <CoreStyleInfo
        content={content}
        q1Response={resp('q1-id', ['q1_introverted'])}
        q2Response={resp('q2-id', ['q2_people'])}
      />
    )
    expect(screen.getByText(/HIGH S/)).toBeInTheDocument()
  })

  it('P1: Introvert + Task resolves to C and renders only the C block', () => {
    render(
      <CoreStyleInfo
        content={content}
        q1Response={resp('q1-id', ['q1_introverted'])}
        q2Response={resp('q2-id', ['q2_task'])}
      />
    )
    expect(screen.getByText(/HIGH C/)).toBeInTheDocument()
  })

  it("P3: missing q1 response renders the fallback content", () => {
    render(
      <CoreStyleInfo
        content={content}
        q1Response={null}
        q2Response={resp('q2-id', ['q2_task'])}
      />
    )
    expect(screen.getByText(/Answer the two questions/)).toBeInTheDocument()
    expect(screen.queryByText(/HIGH D/)).not.toBeInTheDocument()
  })

  it('P3: missing q2 response renders the fallback content', () => {
    render(
      <CoreStyleInfo
        content={content}
        q1Response={resp('q1-id', ['q1_extroverted'])}
        q2Response={null}
      />
    )
    expect(screen.getByText(/Answer the two questions/)).toBeInTheDocument()
  })

  it('P7: numbered lines in per-style content render as <ol>', () => {
    const withList: CoreStyleSectionContent = {
      ...content,
      sections_by_style: {
        ...content.sections_by_style,
        D: 'If you are HIGH D, you are:\n1. Decisive\n2. Direct\n3. Risk-taking',
      },
    }
    render(
      <CoreStyleInfo
        content={withList}
        q1Response={resp('q1-id', ['q1_extroverted'])}
        q2Response={resp('q2-id', ['q2_task'])}
      />
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Decisive')
    expect(items[0].closest('ol')).not.toBeNull()
  })

  it('renders attribution when provided via prop', () => {
    render(
      <CoreStyleInfo
        content={content}
        q1Response={resp('q1-id', ['q1_extroverted'])}
        q2Response={resp('q2-id', ['q2_task'])}
        attribution="Test attribution"
      />
    )
    expect(screen.getByText('Test attribution')).toBeInTheDocument()
  })
})
