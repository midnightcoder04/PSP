import type { SupabaseClient } from '@supabase/supabase-js'

export interface TestUser {
  id: string
  email: string
  displayName: string
}

export interface RoleClient {
  client: SupabaseClient
  user: TestUser
}

export interface Fixtures {
  /** Service-role client — bypasses RLS; used for setup/teardown only */
  adminClient: SupabaseClient
  /** Signed-in clients per role */
  admin: RoleClient
  facilitator: RoleClient
  participant: RoleClient
  inactive: RoleClient
  /** IDs captured during setup */
  sessionId: string
  enrollmentId: string
}
