import { createClient } from '@supabase/supabase-js'
import type { Fixtures, RoleClient } from './_rpc_fixtures.types.js'

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

const url = process.env.VITE_SUPABASE_URL ?? ''
const secretKey = process.env.SUPABASE_SECRET_KEY ?? ''
const password = process.env.RPC_TEST_PASSWORD ?? 'rpc-test-password-default-12'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_EMAILS = {
  admin: '__rpc_test_admin@example.invalid',
  facilitator: '__rpc_test_facilitator@example.invalid',
  participant: '__rpc_test_participant@example.invalid',
  inactive: '__rpc_test_inactive@example.invalid',
} as const

const TEST_SESSION_TITLE = '__rpc_test_session'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeServiceClient() {
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function signIn(email: string): Promise<RoleClient> {
  const client = createClient(url, process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw new Error(`signIn failed for ${email}: ${error?.message}`)
  return { client, user: { id: data.user.id, email, displayName: email } }
}

// ---------------------------------------------------------------------------
// Pre-cleanup: remove leftover __rpc_test_* fixtures before a fresh run
// ---------------------------------------------------------------------------

async function preCleanup(adminClient: ReturnType<typeof makeServiceClient>) {
  // Delete leftover test users
  const { data: users } = await adminClient.auth.admin.listUsers({ perPage: 200 })
  const testUsers = (users?.users ?? []).filter((u) =>
    Object.values(TEST_EMAILS).includes(u.email as (typeof TEST_EMAILS)[keyof typeof TEST_EMAILS])
  )
  for (const u of testUsers) {
    await adminClient.auth.admin.deleteUser(u.id)
  }

  // Delete leftover test session
  await adminClient.from('sessions').delete().eq('title', TEST_SESSION_TITLE)
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export async function setupFixtures(): Promise<Fixtures> {
  const adminClient = makeServiceClient()

  // Best-effort pre-cleanup so re-runs don't collide
  await preCleanup(adminClient)

  // Create four test users via auth admin API (email_confirm: true skips OTP)
  const createUser = async (email: string, displayName: string) => {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    })
    if (error || !data.user) throw new Error(`createUser failed for ${email}: ${error?.message}`)
    return data.user
  }

  const [adminUser, facilUser, partUser, inactiveUser] = await Promise.all([
    createUser(TEST_EMAILS.admin, 'RPC Test Admin'),
    createUser(TEST_EMAILS.facilitator, 'RPC Test Facilitator'),
    createUser(TEST_EMAILS.participant, 'RPC Test Participant'),
    createUser(TEST_EMAILS.inactive, 'RPC Test Inactive'),
  ])

  // The on_auth_user_created trigger inserts profiles with role='participant'.
  // Patch the roles and is_active for admin/facilitator/inactive.
  await Promise.all([
    adminClient
      .from('profiles')
      .update({ role: 'admin', is_active: true })
      .eq('id', adminUser.id),
    adminClient
      .from('profiles')
      .update({ role: 'facilitator', is_active: true })
      .eq('id', facilUser.id),
    adminClient
      .from('profiles')
      .update({ role: 'participant', is_active: true })
      .eq('id', partUser.id),
    adminClient
      .from('profiles')
      .update({ role: 'participant', is_active: false })
      .eq('id', inactiveUser.id),
  ])

  // Insert the test session
  const { data: sessionData, error: sessionError } = await adminClient
    .from('sessions')
    .insert({
      title: TEST_SESSION_TITLE,
      facilitator_id: facilUser.id,
      created_by: adminUser.id,
      scheduled_start: new Date().toISOString().slice(0, 10),
      scheduled_end: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
      is_active: true,
    })
    .select('id')
    .single()
  if (sessionError || !sessionData) throw new Error(`session insert failed: ${sessionError?.message}`)
  const sessionId = sessionData.id as string

  // Insert enrollment
  const { data: enrollData, error: enrollError } = await adminClient
    .from('enrollments')
    .insert({ session_id: sessionId, participant_id: partUser.id, is_active: true })
    .select('id')
    .single()
  if (enrollError || !enrollData) throw new Error(`enrollment insert failed: ${enrollError?.message}`)
  const enrollmentId = enrollData.id as string

  // Look up the first two exercises in the 'personality' section (by order_index)
  const { data: exercises, error: exError } = await adminClient
    .from('exercises')
    .select('id, slug, section_id, sections!inner(slug)')
    .eq('sections.slug', 'personality')
    .order('order_index', { ascending: true })
    .limit(2)
  if (exError || !exercises || exercises.length < 2)
    throw new Error(`exercise lookup failed: ${exError?.message ?? 'less than 2 exercises found'}`)

  const [ex1, ex2] = exercises as Array<{ id: string; slug: string; section_id: string }>

  // Insert two responses (one complete, one in-progress) for the participant
  await adminClient.from('responses').insert([
    {
      participant_id: partUser.id,
      exercise_id: ex1.id,
      session_id: sessionId,
      response_data: {},
      is_complete: true,
    },
    {
      participant_id: partUser.id,
      exercise_id: ex2.id,
      session_id: sessionId,
      response_data: {},
      is_complete: false,
    },
  ])

  // Sign each role in to get a JWT-bearing client
  const [adminRole, facilRole, partRole, inactiveRole] = await Promise.all([
    signIn(TEST_EMAILS.admin),
    signIn(TEST_EMAILS.facilitator),
    signIn(TEST_EMAILS.participant),
    signIn(TEST_EMAILS.inactive),
  ])

  // Patch the display names from actual profile data
  adminRole.user.id = adminUser.id
  adminRole.user.displayName = 'RPC Test Admin'
  facilRole.user.id = facilUser.id
  facilRole.user.displayName = 'RPC Test Facilitator'
  partRole.user.id = partUser.id
  partRole.user.displayName = 'RPC Test Participant'
  inactiveRole.user.id = inactiveUser.id
  inactiveRole.user.displayName = 'RPC Test Inactive'

  return {
    adminClient,
    admin: adminRole,
    facilitator: facilRole,
    participant: partRole,
    inactive: inactiveRole,
    sessionId,
    enrollmentId,
  }
}

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

export async function teardownFixtures(f: Fixtures): Promise<void> {
  try {
    const ac = f.adminClient

    // Delete responses (cascade should handle this, but belt + suspenders)
    await ac.from('responses').delete().eq('session_id', f.sessionId)

    // Delete enrollment
    await ac.from('enrollments').delete().eq('id', f.enrollmentId)

    // Delete session
    await ac.from('sessions').delete().eq('id', f.sessionId)

    // Delete users (profiles + downstream rows cascade via FK ON DELETE CASCADE)
    await Promise.all([
      ac.auth.admin.deleteUser(f.admin.user.id),
      ac.auth.admin.deleteUser(f.facilitator.user.id),
      ac.auth.admin.deleteUser(f.participant.user.id),
      ac.auth.admin.deleteUser(f.inactive.user.id),
    ])
  } catch (e) {
    console.error('teardown failed:', e)
  }
}
