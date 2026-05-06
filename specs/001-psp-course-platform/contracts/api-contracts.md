# API Contracts: PSP Course Platform

**Feature**: 001-psp-course-platform
**Phase**: 1 — Design
**Date**: 2026-05-04

All data access is via the Supabase JavaScript client (`@supabase/supabase-js` v2).
Authorization is enforced server-side by Row Level Security (RLS) policies — no client-side
role checks substitute for RLS. Error codes follow Supabase/PostgREST conventions.

---

## Auth Contracts

### Sign In
```ts
supabase.auth.signInWithPassword({ email: string, password: string })
// Returns: { data: { user, session }, error }
// On success: session stored in localStorage by Supabase client
// On failure: error.message describes issue (invalid credentials, email not confirmed)
```

### Sign Out
```ts
supabase.auth.signOut()
// Clears local session; redirects handled by auth state listener
```

### Password Reset (admin-triggered or user-requested)
```ts
supabase.auth.resetPasswordForEmail(email: string, {
  redirectTo: `${window.location.origin}/reset-password`
})
// Supabase sends reset email; no response data beyond success/error
```

### Get Current Session
```ts
supabase.auth.getSession()
// Returns: { data: { session }, error }
// Used on app init to restore session
```

### Auth State Listener
```ts
supabase.auth.onAuthStateChange((event, session) => {
  // events: SIGNED_IN | SIGNED_OUT | TOKEN_REFRESHED | USER_UPDATED
})
// Must be called once in AuthProvider; unsubscribed on unmount
```

---

## Profile Contracts

### Get Own Profile
```ts
supabase
  .from('profiles')
  .select('id, role, display_name, email, is_active')
  .eq('id', authUserId)
  .single()
// Returns: Profile | null
// Called after SIGNED_IN event to load role for routing
```

### Admin: List All Profiles
```ts
supabase
  .from('profiles')
  .select('id, role, display_name, email, is_active, created_at')
  .order('created_at', { ascending: false })
// RLS: admin only
```

### Admin: Create User Account
```ts
// Step 1: Create auth user (admin API via service role key — server-only or Edge Function)
// Step 2: The trigger creates profiles row automatically
// Step 3: Admin updates role:
supabase
  .from('profiles')
  .update({ role: 'facilitator' | 'admin', display_name, is_active: true })
  .eq('id', newUserId)
// Note: user creation requires service_role key; handled via Supabase Admin API
```

### Admin: Toggle User Active State
```ts
supabase
  .from('profiles')
  .update({ is_active: false, updated_at: new Date().toISOString() })
  .eq('id', targetUserId)
// RLS: admin only
```

---

## Session Contracts

### List Sessions (role-filtered by RLS)
```ts
supabase
  .from('sessions')
  .select(`
    id, title, description, scheduled_start, scheduled_end, is_active,
    facilitator:profiles!facilitator_id(display_name, email),
    enrollments(count)
  `)
  .eq('is_active', true)
  .order('scheduled_start', { ascending: false })
```

### Admin: Create Session
```ts
supabase
  .from('sessions')
  .insert({
    title: string,
    description: string | null,
    facilitator_id: uuid,
    scheduled_start: date,
    scheduled_end: date,
    created_by: adminUserId
  })
  .select()
  .single()
```

### Admin: Update Session
```ts
supabase
  .from('sessions')
  .update({ title?, description?, facilitator_id?, scheduled_start?, scheduled_end?,
             is_active?, updated_at: now() })
  .eq('id', sessionId)
```

---

## Enrollment Contracts

### Admin: Enroll Participant
```ts
supabase
  .from('enrollments')
  .insert({ session_id: uuid, participant_id: uuid })
  .select()
  .single()
// Upsert pattern: if row exists, set is_active = true
```

### Admin: Unenroll Participant
```ts
supabase
  .from('enrollments')
  .update({ is_active: false })
  .eq('session_id', sessionId)
  .eq('participant_id', participantId)
```

### List Enrollments for Session
```ts
supabase
  .from('enrollments')
  .select(`
    id, enrolled_at, is_active,
    participant:profiles!participant_id(id, display_name, email)
  `)
  .eq('session_id', sessionId)
  .eq('is_active', true)
```

---

## Course Content Contracts

### List All Sections (ordered)
```ts
supabase
  .from('sections')
  .select('id, slug, title, subtitle, description, order_index, icon_name')
  .order('order_index')
// RLS: any authenticated active user
```

### List Exercises for Section
```ts
supabase
  .from('exercises')
  .select('id, slug, title, type, content_json, order_index, is_scored, attribution')
  .eq('section_id', sectionId)
  .order('order_index')
```

---

## Response Contracts

### Upsert Response (auto-save on interaction)
```ts
supabase
  .from('responses')
  .upsert({
    participant_id: authUserId,
    exercise_id: uuid,
    session_id: uuid | null,
    response_json: object,          // matches exercise type schema
    is_complete: boolean,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'participant_id,exercise_id,session_id'
  })
// Called debounced (300ms) on every text input; immediately on checkbox/ranking change
```

### Load Participant Responses for Section
```ts
supabase
  .from('responses')
  .select('exercise_id, response_json, is_complete, updated_at')
  .eq('participant_id', participantId)
  .in('exercise_id', exerciseIdsInSection)
  // Optional: filter by session_id if in session context
```

---

## Progress Contracts

### Load Participant Section Progress
```ts
supabase
  .from('progress')
  .select(`
    section_id, completed_exercises, total_exercises,
    section_completed_at, last_exercise_id, last_activity_at
  `)
  .eq('participant_id', participantId)
  // Optional session_id filter
```

### Resume Position (RPC)
```ts
supabase.rpc('get_resume_position', {
  p_participant_id: uuid,
  p_session_id: uuid | null
})
// Returns: { section_slug: string, exercise_slug: string } | null
```

---

## Statistics Contracts

### Facilitator: Session Stats (RPC)
```ts
supabase.rpc('get_session_stats', { p_session_id: uuid })
// Returns: Array<{
//   participant_id: uuid,
//   display_name: string,
//   overall_pct: number,       // 0–100
//   sections: Array<{
//     slug: string,
//     completed: number,
//     total: number,
//     completed_at: string | null
//   }>
// }>
// RLS: facilitator must own the session or be admin
```

### Admin: Platform Overview (RPC)
```ts
supabase.rpc('get_admin_overview')
// Returns: {
//   total_sessions: number,
//   active_sessions: number,
//   total_participants: number,
//   overall_completion_pct: number,
//   sections: Array<{ slug: string, title: string, avg_completion_pct: number }>
// }
// RLS: admin only
```

---

## Realtime Subscription Contracts

### Facilitator: Subscribe to Session Progress
```ts
const channel = supabase
  .channel(`session:${sessionId}:progress`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'progress',
      filter: `session_id=eq.${sessionId}`
    },
    (payload) => {
      // payload.new: updated progress row
      // Trigger re-fetch of get_session_stats or merge into local state
    }
  )
  .subscribe()

// Cleanup on component unmount:
supabase.removeChannel(channel)
```

---

## Error Handling Contract

All Supabase calls return `{ data, error }`. Client code MUST handle errors as follows:

| Error Code | Meaning | UI Response |
|---|---|---|
| `PGRST116` | Row not found (.single() on empty) | Show empty state, not error |
| `42501` | RLS violation (unauthorized) | Redirect to login or show 403 page |
| `23505` | Unique constraint violation | Retry with upsert logic |
| Network error | Offline or Supabase down | Show persistent banner; queue retries for responses |

Errors MUST be logged to the browser console in development; production error logging
strategy to be defined in v2.
