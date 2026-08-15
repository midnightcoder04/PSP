export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface SectionFraming {
  opening_quote: { text: string; attribution: string }
  opening_question: string
  facilitator_says: string
  why_it_matters: string
  closing_reflection: string
  bridge_to_next: string | null
  reading_material?: {
    title: string
    content: string
    url?: string
  } | null
}

// Iteration 4 — new exercise type shapes ------------------------------------

export interface StructuredTextQuestion {
  id: string
  // `prompt` is the canonical field per contracts/seed-json.md (004-content-restructure).
  // `label` is the legacy field used by Iter 4 seed entries; renderer reads
  // `prompt ?? label` for backward compatibility during the seed rewrite.
  prompt?: string
  label?: string
  placeholder?: string
  required?: boolean
  min_length?: number
  max_length?: number
}

export interface StructuredTextContent {
  // Top-level prompt is optional in the new contract — the per-question contract
  // (questions[].prompt) is canonical. `intro` is the new name for the preamble;
  // `prompt` is preserved here for backward compatibility with legacy seed rows.
  prompt?: string
  intro?: string
  combined?: boolean
  combined_rationale?: string
  questions: StructuredTextQuestion[]
}

export interface StructuredTextResponse {
  answers: Record<string, string>
  _legacy?: string
}

export interface RatingPickerContent {
  prompt: string
  scale: { min: number; max: number; labels?: string[] }
  items: { id: string; label: string }[]
}

export interface RatingPickerResponse {
  ratings: Record<string, number>
}

export interface RankingDerivesFrom {
  source_exercise_slug: string
  group_by: 'id_prefix' | 'values_pair_sum' | 'goal_inventory_rows'
}

export interface RankingContent {
  prompt: string
  items: { id: string; label: string }[]
  /**
   * 006-iter6 / US1: `'sorted'` opts the exercise into the read-only
   * sorted-listing branch. Requires `derives_from` to be set.
   */
  interaction?: 'drag' | 'buttons' | 'sorted'
  derives_from?: RankingDerivesFrom
  show_counts?: boolean
}

/**
 * 006-iter6 / US3: info exercise whose body is keyed by the participant's
 * resolved core style (D / I / S / C). See
 * specs/006-iter6-personality-watusi-polish/contracts/personality-deep-dive.md
 */
export interface CoreStyleSectionContent {
  /** Fallback prose when the quiz answers are missing. */
  content: string
  computed: 'core_style_section'
  /** [q1_id, q2_id] — exercise IDs (not slugs) of the two quiz questions. */
  computed_inputs: [string, string]
  /** Body to render via parseBlocks, keyed by the resolved style. */
  sections_by_style: Record<'D' | 'I' | 'S' | 'C', string>
  attribution?: string | null
}

/**
 * 006-iter6 / US3: checkbox exercise whose option list is keyed by the
 * participant's resolved core style.
 */
export interface CoreStyleChecklistContent {
  prompt: string
  allow_multiple: true
  computed: 'core_style_options'
  computed_inputs: [string, string]
  options_by_style: Record<
    'D' | 'I' | 'S' | 'C',
    { id: string; label: string; value?: number }[]
  >
}

export interface TableContent {
  prompt: string
  headers: string[]
  rows: number
  col_types?: ('text' | 'number' | 'currency')[]
  total_target?: number
}

export interface TableResponse {
  rows: string[][]
  total_spent?: number
}

// ── Presentation deck (deck_slides.content_json, discriminated by row.kind) ──
// All fields are plain strings / string arrays so the admin text-level editor
// can edit them field-by-field (arrays as one-item-per-line textareas).

export type DeckSlideKind =
  | 'cover'
  | 'section-title'
  | 'quote'
  | 'statement'
  | 'bullets'
  | 'two-col'
  | 'disc-profile'
  | 'comfort-zones'
  | 'comfort-zones-pair'
  | 'numbered-list'
  | 'image'
  | 'contact'
  | 'attitude-conflict-matrix'

export interface DeckCoverContent {
  title: string
  subtitle?: string
  date_line?: string
  facilitator_name?: string
  org_line?: string
  image?: string
}

// A band of client/partner logos, grouped by the line of business they belong
// to. Each logo is a file under public/ plus the organization's name, which
// doubles as the img alt text (several logos are wordmarks in other scripts).
export interface DeckLogoGroup {
  heading: string
  logos: { name: string; src: string }[]
}

export interface DeckSectionTitleContent {
  title: string
  subtitle?: string
  /** Small subscript under the subtitle — e.g. an ideological tagline. */
  tagline?: string
  kicker?: string
  logos_title?: string
  logo_groups?: DeckLogoGroup[]
}

export interface DeckQuoteContent {
  quote: string
  attribution: string
}

export interface DeckStatementContent {
  title: string
  body: string // rendered through parseBlocks()
}

export interface DeckBulletsContent {
  title: string
  intro?: string
  bullets: string[]
}

export interface DeckTwoColContent {
  title: string
  columns: { heading: string; bullets: string[]; image?: string }[]
}

export interface DeckDiscProfileContent {
  style: 'D' | 'I' | 'S' | 'C'
  title: string
  subtitle?: string
  adjectives: string[]
  statements: string[]
  youAre?: string[]
  environment?: string[]
}

// One "Comfort Zones for HIGH x" slide: the style paired against each of the
// four core styles, drawn as overlapping circles. `level` is the qualitative
// size of the shared Comfort Zone (how much the two circles overlap) — kept as
// a word, not a number, so the admin text editor stays text-level.
export type ComfortZoneLevel = 'low' | 'moderate' | 'high' | 'very-high'

export interface DeckComfortZonesContent {
  style: 'D' | 'I' | 'S' | 'C'
  title: string
  subtitle?: string
  caption?: string
  pairs: { other: 'D' | 'I' | 'S' | 'C'; level: ComfortZoneLevel; text: string }[]
}

export interface DeckNumberedContent {
  title: string
  start?: number // first item number (for lists continued across slides)
  items: string[]
  /** Optional illustration shown beside the list (Values Shopping Spree). */
  image?: string
}

export interface DeckImageContent {
  title?: string
  src: string
  caption?: string
}

export interface DeckContactContent {
  title: string
  lines: string[]
  image?: string
}

// Two comfort-zone sections side by side on one slide (e.g. HIGH D + HIGH I).
export interface DeckComfortZonesPairContent {
  caption?: string
  left: DeckComfortZonesContent
  right: DeckComfortZonesContent
}

// Attitude Conflict Matrix — a 6×6 symmetric grid showing how each WATUSI
// attitude pair interacts. `caption` is sourced from Spranger / TTI.
export type WatusiLetter = 'W' | 'A' | 'T' | 'U' | 'S' | 'I'

export interface DeckAttitudeConflictContent {
  title: string
  subtitle?: string
  caption?: string
  /** Labels for the six attitude letters, in W-A-T-U-S-I order. */
  labels: Record<WatusiLetter, string>
  /**
   * 6×6 flat array of cell texts, row-major order (row 0 = W row).
   * Index = row * 6 + col. Diagonal cells are the "same attitude" descriptions.
   * The matrix is symmetric; upper-triangle values are canonical.
   */
  cells: string[]
}

export type DeckSlideContent =
  | DeckCoverContent
  | DeckSectionTitleContent
  | DeckQuoteContent
  | DeckStatementContent
  | DeckBulletsContent
  | DeckTwoColContent
  | DeckDiscProfileContent
  | DeckComfortZonesContent
  | DeckComfortZonesPairContent
  | DeckNumberedContent
  | DeckImageContent
  | DeckContactContent
  | DeckAttitudeConflictContent

// session_deck_overrides.cover_json — per-session cover slide customization
export interface SessionCoverOverride {
  title_line?: string
  subtitle?: string
  date_line?: string
  facilitator_name?: string
}

// ── Topic-aware presentation (007) ──────────────────────────────────────────
// topic_segments.content_json shapes, discriminated by row.kind. These render
// as synthetic presenter slides interleaved at course-chapter boundaries.

export type TopicSegmentKind = 'discussion' | 'example' | 'suggestion'

export interface DeckDiscussionContent {
  title: string
  questions: string[]
}

export interface DeckExampleContent {
  title: string
  body: string // rendered through parseBlocks()
}

export interface DeckSuggestionContent {
  title: string
  body: string // rendered through parseBlocks()
}

export type SessionType = 'team-based' | 'individual' | 'private-group'

// Presenter-only slide kinds. Kept separate from DeckSlideKind (which mirrors
// the deck_slides CHECK constraint) because these slides are synthesized in
// memory by buildPresentedSlides() and are never persisted to deck_slides.
export type PresentedSlideKind =
  | DeckSlideKind
  | TopicSegmentKind
  | 'team-collaboration'

// A DeckSlide widened to allow the synthetic kinds. Real DeckSlide rows are
// assignable to this (their narrower kind is a subset), so DeckSlideView,
// SlideMenu, etc. accept both.
export interface PresentedSlide extends Omit<DeckSlide, 'kind'> {
  kind: PresentedSlideKind
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'facilitator' | 'participant'
          display_name: string
          email: string
          phone: string | null
          is_active: boolean
          max_bulk_add: number
          can_present: boolean
          must_reset_password: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'facilitator' | 'participant'
          display_name: string
          email: string
          phone?: string | null
          is_active?: boolean
          max_bulk_add?: number
          can_present?: boolean
          must_reset_password?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'facilitator' | 'participant'
          display_name?: string
          email?: string
          phone?: string | null
          is_active?: boolean
          max_bulk_add?: number
          can_present?: boolean
          must_reset_password?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          facilitator_id: string
          title: string
          description: string | null
          scheduled_start: string | null
          scheduled_end: string | null
          is_active: boolean
          session_type: SessionType
          restrict_to_values: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          facilitator_id: string
          title: string
          description?: string | null
          scheduled_start?: string | null
          scheduled_end?: string | null
          is_active?: boolean
          session_type?: SessionType
          restrict_to_values?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          facilitator_id?: string
          title?: string
          description?: string | null
          scheduled_start?: string | null
          scheduled_end?: string | null
          is_active?: boolean
          session_type?: SessionType
          restrict_to_values?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sessions_facilitator_id_fkey'
            columns: ['facilitator_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      enrollments: {
        Row: {
          id: string
          session_id: string
          participant_id: string
          enrolled_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          session_id: string
          participant_id: string
          enrolled_at?: string
          is_active?: boolean
        }
        Update: {
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'enrollments_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'enrollments_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      session_invites: {
        Row: {
          id: string
          session_id: string
          token: string
          created_by: string
          max_uses: number
          use_count: number
          expires_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          token?: string
          created_by: string
          max_uses?: number
          use_count?: number
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          is_active?: boolean
          max_uses?: number
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'session_invites_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_invites_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      sections: {
        Row: {
          id: string
          slug: string
          title: string
          subtitle: string | null
          description: string | null
          order_index: number
          icon_name: string | null
          framing: SectionFraming | null
          // group_slug added by migration 014 (004-content-restructure). Nullable to
          // support the "Unassigned" fallback band on /course (spec.md Edge Cases).
          group_slug: 'self-awareness' | 'goal-setting' | 'strategic-planning' | null
        }
        Insert: {
          id?: string
          slug: string
          title: string
          subtitle?: string | null
          description?: string | null
          order_index: number
          icon_name?: string | null
          framing?: SectionFraming | null
          group_slug?: 'self-awareness' | 'goal-setting' | 'strategic-planning' | null
        }
        Update: {
          title?: string
          subtitle?: string | null
          description?: string | null
          order_index?: number
          icon_name?: string | null
          framing?: SectionFraming | null
          group_slug?: 'self-awareness' | 'goal-setting' | 'strategic-planning' | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          id: string
          section_id: string
          slug: string
          title: string
          type: 'checkbox' | 'text' | 'table' | 'ranking' | 'info' | 'structured-text' | 'rating-picker'
          content_json: Json
          order_index: number
          slide_group: number | null
          is_scored: boolean
          attribution: string | null
        }
        Insert: {
          id?: string
          section_id: string
          slug: string
          title: string
          type: 'checkbox' | 'text' | 'table' | 'ranking' | 'info' | 'structured-text' | 'rating-picker'
          content_json: Json
          order_index: number
          slide_group?: number | null
          is_scored?: boolean
          attribution?: string | null
        }
        Update: {
          title?: string
          type?: 'checkbox' | 'text' | 'table' | 'ranking' | 'info' | 'structured-text' | 'rating-picker'
          content_json?: Json
          order_index?: number
          slide_group?: number | null
          attribution?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'exercises_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'sections'
            referencedColumns: ['id']
          }
        ]
      }
      responses: {
        Row: {
          id: string
          participant_id: string
          exercise_id: string
          session_id: string | null
          response_json: Json
          is_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          exercise_id: string
          session_id?: string | null
          response_json: Json
          is_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          response_json?: Json
          is_complete?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'responses_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'responses_exercise_id_fkey'
            columns: ['exercise_id']
            isOneToOne: false
            referencedRelation: 'exercises'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'responses_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
      progress: {
        Row: {
          id: string
          participant_id: string
          section_id: string
          session_id: string | null
          completed_exercises: number
          total_exercises: number
          section_completed_at: string | null
          last_exercise_id: string | null
          last_activity_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          section_id: string
          session_id?: string | null
          completed_exercises?: number
          total_exercises: number
          section_completed_at?: string | null
          last_exercise_id?: string | null
          last_activity_at?: string
        }
        Update: {
          completed_exercises?: number
          section_completed_at?: string | null
          last_exercise_id?: string | null
          last_activity_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'progress_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'progress_section_id_fkey'
            columns: ['section_id']
            isOneToOne: false
            referencedRelation: 'sections'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'progress_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
      testimonials: {
        Row: {
          id: string
          participant_id: string
          session_id: string | null
          content: string
          rating: number | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          session_id?: string | null
          content: string
          rating?: number | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'testimonials_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'testimonials_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
      deck_slides: {
        Row: {
          id: string
          slug: string
          kind: DeckSlideKind
          chapter: string
          order_index: number
          content_json: Json
          linked_exercise_slugs: string[]
          notes: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          kind: DeckSlideKind
          chapter: string
          order_index: number
          content_json: Json
          linked_exercise_slugs?: string[]
          notes?: string | null
          updated_at?: string
        }
        Update: {
          content_json?: Json
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      session_deck_overrides: {
        Row: {
          session_id: string
          cover_json: Json
          updated_at: string
        }
        Insert: {
          session_id: string
          cover_json: Json
          updated_at?: string
        }
        Update: {
          cover_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'session_deck_overrides_session_id_fkey'
            columns: ['session_id']
            isOneToOne: true
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
      training_topics: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          is_active: boolean
          order_index: number
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          is_active?: boolean
          order_index?: number
          updated_at?: string
        }
        Update: {
          slug?: string
          name?: string
          description?: string | null
          is_active?: boolean
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      session_topics: {
        Row: {
          session_id: string
          topic_id: string
        }
        Insert: {
          session_id: string
          topic_id: string
        }
        Update: {
          session_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'session_topics_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_topics_topic_id_fkey'
            columns: ['topic_id']
            isOneToOne: false
            referencedRelation: 'training_topics'
            referencedColumns: ['id']
          }
        ]
      }
      topic_segments: {
        Row: {
          id: string
          topic_id: string
          chapter: string
          kind: TopicSegmentKind
          content_json: Json
          order_index: number
          is_active: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          topic_id: string
          chapter: string
          kind: TopicSegmentKind
          content_json: Json
          order_index?: number
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          chapter?: string
          kind?: TopicSegmentKind
          content_json?: Json
          order_index?: number
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'topic_segments_topic_id_fkey'
            columns: ['topic_id']
            isOneToOne: false
            referencedRelation: 'training_topics'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_session_stats: {
        Args: { p_session_id: string }
        Returns: Array<{
          participant_id: string
          display_name: string
          overall_pct: number
          sections: Json
        }>
      }
      get_admin_overview: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_resume_position: {
        Args: { p_participant_id: string; p_session_id: string | null }
        Returns: Array<{ section_slug: string; exercise_slug: string }>
      }
      peek_invite: {
        Args: { p_token: string }
        Returns: Json
      }
      claim_invite_slot: {
        Args: { p_token: string }
        Returns: string | null
      }
      has_presenter_access: {
        Args: { uid: string }
        Returns: boolean
      }
      get_session_live_responses: {
        Args: { p_session_id: string; p_exercise_slugs: string[] }
        Returns: Array<{
          participant_id: string
          display_name: string
          exercise_slug: string
          exercise_type: string
          response_json: Json | null
          is_complete: boolean
          updated_at: string | null
        }>
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type Profile = Tables<'profiles'>
export type Session = Tables<'sessions'>
export type Enrollment = Tables<'enrollments'>
export type SessionInvite = Tables<'session_invites'>
export type Section = Tables<'sections'>
export type Exercise = Tables<'exercises'>
export type Response = Tables<'responses'>
export type Progress = Tables<'progress'>
export type Testimonial = Tables<'testimonials'>
export type DeckSlide = Tables<'deck_slides'>
export type SessionDeckOverride = Tables<'session_deck_overrides'>
export type TrainingTopic = Tables<'training_topics'>
export type SessionTopic = Tables<'session_topics'>
export type TopicSegment = Tables<'topic_segments'>

// SectionGroup is a logical entity derived from sections.group_slug + GROUP_META
// (no separate DB table — see specs/004-content-restructure/research.md R1).
// Returned by useSectionGroups().
export interface SectionGroup {
  slug: 'self-awareness' | 'goal-setting' | 'strategic-planning' | 'unassigned'
  title: string
  description: string
  order: number
  sections: Section[]
}
