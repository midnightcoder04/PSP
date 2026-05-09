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
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'facilitator' | 'participant'
          display_name: string
          email: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'facilitator' | 'participant'
          display_name?: string
          email?: string
          is_active?: boolean
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
        }
        Update: {
          title?: string
          subtitle?: string | null
          description?: string | null
          order_index?: number
          icon_name?: string | null
          framing?: SectionFraming | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          id: string
          section_id: string
          slug: string
          title: string
          type: 'checkbox' | 'text' | 'table' | 'ranking' | 'info'
          content_json: Json
          order_index: number
          is_scored: boolean
          attribution: string | null
        }
        Insert: {
          id?: string
          section_id: string
          slug: string
          title: string
          type: 'checkbox' | 'text' | 'table' | 'ranking' | 'info'
          content_json: Json
          order_index: number
          is_scored?: boolean
          attribution?: string | null
        }
        Update: {
          title?: string
          type?: 'checkbox' | 'text' | 'table' | 'ranking' | 'info'
          content_json?: Json
          order_index?: number
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
export type Section = Tables<'sections'>
export type Exercise = Tables<'exercises'>
export type Response = Tables<'responses'>
export type Progress = Tables<'progress'>
