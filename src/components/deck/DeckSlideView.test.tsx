import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeckSlideView } from './DeckSlideView'
import type { DeckSlide, PresentedSlide } from '@/types/database'

function makePresented(kind: PresentedSlide['kind'], content_json: unknown): PresentedSlide {
  return {
    id: `id-${kind}`,
    slug: `test-${kind}`,
    kind,
    chapter: 'personality',
    order_index: -1,
    content_json: content_json as PresentedSlide['content_json'],
    linked_exercise_slugs: [],
    notes: null,
    updated_at: '2026-07-15T00:00:00Z',
  }
}

function makeSlide(kind: DeckSlide['kind'], content_json: unknown): DeckSlide {
  return {
    id: `id-${kind}`,
    slug: `test-${kind}`,
    kind,
    chapter: 'opening',
    order_index: 10,
    content_json: content_json as DeckSlide['content_json'],
    linked_exercise_slugs: [],
    notes: null,
    updated_at: '2026-07-10T00:00:00Z',
  }
}

describe('DeckSlideView', () => {
  it('renders a cover slide with base content', () => {
    render(
      <DeckSlideView
        slide={makeSlide('cover', {
          title: 'Personal Strategic Planning™',
          subtitle: 'PSP™',
          org_line: 'Adapted with permission',
        })}
      />
    )
    expect(screen.getByRole('heading', { name: /personal strategic planning/i })).toBeInTheDocument()
    expect(screen.getByText('PSP™')).toBeInTheDocument()
    expect(screen.getByText('Adapted with permission')).toBeInTheDocument()
  })

  it('merges the per-session cover override into the cover slide', () => {
    render(
      <DeckSlideView
        slide={makeSlide('cover', { title: 'Personal Strategic Planning™' })}
        coverOverride={{
          title_line: 'Spring Cohort 2026',
          facilitator_name: 'Bijo Abraham',
          date_line: '12 July 2026',
        }}
      />
    )
    expect(screen.getByText('Spring Cohort 2026')).toBeInTheDocument()
    expect(screen.getByText(/Bijo Abraham · 12 July 2026/)).toBeInTheDocument()
  })

  it('does not apply cover override fields to non-cover slides', () => {
    render(
      <DeckSlideView
        slide={makeSlide('section-title', { title: 'MY VALUES' })}
        coverOverride={{ title_line: 'Spring Cohort 2026' }}
      />
    )
    expect(screen.queryByText('Spring Cohort 2026')).not.toBeInTheDocument()
  })

  it('renders the client logo wall on a section-title slide', () => {
    render(
      <DeckSlideView
        slide={makeSlide('section-title', {
          title: 'Empowering Individuals Globally',
          tagline: 'Built for growth',
          logos_title: 'Hiring partner · Trusted by leading organizations',
          logo_groups: [
            {
              heading: 'Recruitment Consulting',
              logos: [{ name: 'Wells Fargo', src: '/deck/logos/wells-fargo.png' }],
            },
            {
              heading: 'Corporate Training & People Development',
              logos: [{ name: 'ThinkPalm', src: '/deck/logos/thinkpalm.png' }],
            },
          ],
        })}
      />
    )
    expect(screen.getByText('Recruitment Consulting')).toBeInTheDocument()
    expect(screen.getByText(/trusted by leading organizations/i)).toBeInTheDocument()
    expect(screen.getByAltText('Wells Fargo')).toHaveAttribute('src', '/deck/logos/wells-fargo.png')
    expect(screen.getByAltText('ThinkPalm')).toBeInTheDocument()
  })

  it('leaves a section-title slide without logo_groups unchanged', () => {
    const { container } = render(<DeckSlideView slide={makeSlide('section-title', { title: 'MY VALUES' })} />)
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('renders a quote slide with attribution', () => {
    render(
      <DeckSlideView
        slide={makeSlide('quote', { quote: 'If you fail to plan, you are planning to fail.', attribution: 'Benjamin Franklin' })}
      />
    )
    expect(screen.getByText(/if you fail to plan/i)).toBeInTheDocument()
    expect(screen.getByText(/benjamin franklin/i)).toBeInTheDocument()
  })

  it('renders a statement slide body through the block parser', () => {
    render(
      <DeckSlideView
        slide={makeSlide('statement', {
          title: 'ROLES & THEIR DEMANDS',
          body: 'Write 10 roles that you play or want to play.\nPrioritize them.',
        })}
      />
    )
    expect(screen.getByText(/write 10 roles/i)).toBeInTheDocument()
    expect(screen.getByText(/prioritize them/i)).toBeInTheDocument()
  })

  it('renders bullets slides as list items', () => {
    render(
      <DeckSlideView
        slide={makeSlide('bullets', { title: 'Expectation Setting', bullets: ['Trust your instincts', 'Think holistically'] })}
      />
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders a two-col slide with headings and optional images', () => {
    render(
      <DeckSlideView
        slide={makeSlide('two-col', {
          title: 'What are you predominantly?',
          columns: [
            { heading: 'Introvert', bullets: [], image: '/deck/introvert.png' },
            { heading: 'Extrovert', bullets: [], image: '/deck/extrovert.png' },
          ],
        })}
      />
    )
    expect(screen.getByText('Introvert')).toBeInTheDocument()
    expect(screen.getByText('Extrovert')).toBeInTheDocument()
  })

  it('renders a disc-profile slide with letter chip, adjectives and statements', () => {
    render(
      <DeckSlideView
        slide={makeSlide('disc-profile', {
          style: 'D',
          title: 'HIGH D',
          subtitle: 'Extroverted + Task Oriented',
          adjectives: ['Ambitious', 'Decisive'],
          statements: ['I have a desire to win'],
        })}
      />
    )
    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.getByText('HIGH D')).toBeInTheDocument()
    expect(screen.getByText('Characteristics')).toBeInTheDocument()
    expect(screen.getByText('Ambitious')).toBeInTheDocument()
    expect(screen.getByText(/desire to win/i)).toBeInTheDocument()
  })

  it('renders the page-2 disc-profile slide ("you are" + ideal environment) with no characteristics section', () => {
    render(
      <DeckSlideView
        slide={makeSlide('disc-profile', {
          style: 'D',
          title: 'HIGH D',
          subtitle: 'Extroverted + Task Oriented',
          adjectives: [],
          statements: [],
          youAre: ['Able to make decisions quickly'],
          environment: ['Freedom from controls, supervision and details'],
        })}
      />
    )
    expect(screen.getByText('HIGH D')).toBeInTheDocument()
    expect(screen.getByText('If you are a HIGH D, you are…')).toBeInTheDocument()
    expect(screen.getByText('Able to make decisions quickly')).toBeInTheDocument()
    expect(screen.getByText('Ideal Environment for the HIGH D')).toBeInTheDocument()
    expect(screen.getByText('Freedom from controls, supervision and details')).toBeInTheDocument()
    expect(screen.queryByText('Characteristics')).not.toBeInTheDocument()
  })

  it('renders a comfort-zones slide with one Venn pair per core style', () => {
    render(
      <DeckSlideView
        slide={makeSlide('comfort-zones', {
          style: 'D',
          title: 'Comfort Zones for HIGH D',
          caption: 'Adapted with permission',
          pairs: [
            { other: 'D', level: 'moderate', text: 'Same approach toward life.' },
            { other: 'I', level: 'high', text: 'Both are extroverted.' },
            { other: 'S', level: 'low', text: 'Low Comfort Zone due to dissimilar personalities.' },
            { other: 'C', level: 'low', text: "D's need for immediate results clashes." },
          ],
        })}
      />
    )
    expect(screen.getByText('Comfort Zones for HIGH D')).toBeInTheDocument()
    expect(screen.getByText(/Both are extroverted/)).toBeInTheDocument()
    expect(screen.getByText('Adapted with permission')).toBeInTheDocument()
    // Four Venn diagrams, labelled by Comfort Zone size for screen readers.
    expect(screen.getAllByRole('img')).toHaveLength(4)
    expect(screen.getByLabelText('High Comfort Zone')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Low Comfort Zone')).toHaveLength(2)
  })

  it('renders a comfort-zones-pair slide showing two side-by-side grids', () => {
    render(
      <DeckSlideView
        slide={makeSlide('comfort-zones-pair', {
          caption: 'Adapted with permission from TTI',
          left: {
            style: 'D',
            title: 'Comfort Zones — HIGH D',
            pairs: [{ other: 'I', level: 'high', text: 'Both are extroverted.' }],
          },
          right: {
            style: 'I',
            title: 'Comfort Zones — HIGH I',
            pairs: [{ other: 'D', level: 'high', text: 'I likes D.' }],
          },
        })}
      />
    )
    expect(screen.getByText('Comfort Zones — HIGH D')).toBeInTheDocument()
    expect(screen.getByText('Comfort Zones — HIGH I')).toBeInTheDocument()
    expect(screen.getByText(/Both are extroverted/)).toBeInTheDocument()
    expect(screen.getByText(/I likes D/)).toBeInTheDocument()
    expect(screen.getByText(/Adapted with permission/)).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('draws a wider Venn overlap for a higher Comfort Zone level', () => {
    const pairsFor = (level: string) => [{ other: 'D', level, text: 'x' }]
    const overlapWidth = (level: string) => {
      const { container, unmount } = render(
        <DeckSlideView
          slide={makeSlide('comfort-zones', { style: 'D', title: 'T', pairs: pairsFor(level) })}
        />
      )
      const circles = container.querySelectorAll('circle')
      const cx = [...circles].map((c) => Number(c.getAttribute('cx')))
      unmount()
      return Math.abs(cx[1] - cx[0])
    }
    // Closer centres = more overlap = bigger shared Comfort Zone.
    expect(overlapWidth('very-high')).toBeLessThan(overlapWidth('high'))
    expect(overlapWidth('high')).toBeLessThan(overlapWidth('low'))
  })

  it('renders a numbered-list slide honoring the start offset', () => {
    render(
      <DeckSlideView
        slide={makeSlide('numbered-list', { title: 'Values Shopping Spree', start: 11, items: ['The perfect relationship.'] })}
      />
    )
    const list = screen.getByRole('list')
    expect(list).toHaveAttribute('start', '11')
  })

  it('renders an image slide with caption', () => {
    render(
      <DeckSlideView
        slide={makeSlide('image', { title: 'The D.I.S.C. Model', src: '/deck/disc-logo.png', caption: 'Dominance · Influence' })}
      />
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', '/deck/disc-logo.png')
    expect(screen.getByText(/dominance/i)).toBeInTheDocument()
  })

  it('renders a contact slide lines', () => {
    render(
      <DeckSlideView
        slide={makeSlide('contact', { title: 'THANK YOU', lines: ['Website: www.risewithpsp.com'] })}
      />
    )
    expect(screen.getByText('THANK YOU')).toBeInTheDocument()
    expect(screen.getByText(/risewithpsp/i)).toBeInTheDocument()
  })

  // ── Topic-aware insert kinds (007) ──────────────────────────────────────
  it('renders a discussion insert with its questions as list items', () => {
    render(
      <DeckSlideView
        slide={makePresented('discussion', {
          title: 'Leading across styles',
          questions: ['Why do people differ?', 'How does each style help a team?'],
        })}
      />
    )
    expect(screen.getByText(/discuss as a group/i)).toBeInTheDocument()
    expect(screen.getByText('Leading across styles')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders an example insert body', () => {
    render(
      <DeckSlideView slide={makePresented('example', { title: 'A real handoff', body: 'A manager delegated the sprint.' })} />
    )
    expect(screen.getByText('Example')).toBeInTheDocument()
    expect(screen.getByText(/delegated the sprint/i)).toBeInTheDocument()
  })

  it('renders a suggestion insert body', () => {
    render(
      <DeckSlideView slide={makePresented('suggestion', { title: 'Try this', body: 'Ask one open question.' })} />
    )
    expect(screen.getByText('Tip')).toBeInTheDocument()
    expect(screen.getByText(/one open question/i)).toBeInTheDocument()
  })

  it('renders a team-collaboration placeholder (no session context)', () => {
    render(<DeckSlideView slide={makePresented('team-collaboration', {})} />)
    expect(screen.getByText(/team collaboration/i)).toBeInTheDocument()
    expect(screen.getByText(/appear here during the session/i)).toBeInTheDocument()
  })
})
