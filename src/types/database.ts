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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'facilitator' | 'participant'
          display_name: string
          email: string
          is_active: boolean
          max_bulk_add: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'facilitator' | 'participant'
          display_name: string
          email: string
          is_active?: boolean
          max_bulk_add?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'facilitator' | 'participant'
          display_name?: string
          email?: string
          is_active?: boolean
          max_bulk_add?: number
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
