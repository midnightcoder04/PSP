// Deno Edge Function — claim-invite
// verify_jwt: false (public — called before the user has an account)
//
// Validates an invite token, creates a participant account, auto-enrolls them,
// and atomically increments the invite use_count via claim_invite_slot().

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  token: string
  email: string
  display_name: string
  password: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const body: RequestBody = await req.json()
  const { token, email, display_name, password } = body

  if (!token || !email || !password || password.length < 8) {
    return new Response(JSON.stringify({ error: 'MISSING_OR_INVALID_FIELDS' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Read invite for session title and UX-level early exits (active/expired checks).
  // The authoritative slot-exhaustion check is the atomic claim below.
  const { data: invite, error: inviteErr } = await adminClient
    .from('session_invites')
    .select('id, session_id, max_uses, use_count, is_active, expires_at, sessions(title)')
    .eq('token', token)
    .single()

  if (inviteErr || !invite) {
    return new Response(JSON.stringify({ error: 'INVITE_NOT_FOUND' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!invite.is_active) {
    return new Response(JSON.stringify({ error: 'INVITE_INACTIVE' }), {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: 'INVITE_EXPIRED' }), {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Atomically claim a slot before creating the user. claim_invite_slot() does a
  // single UPDATE ... WHERE use_count < max_uses, eliminating the TOCTOU race
  // that the old read-check-write pattern was vulnerable to.
  const { data: claimedSessionId, error: claimErr } = await adminClient
    .rpc('claim_invite_slot', { p_token: token })

  if (claimErr || !claimedSessionId) {
    return new Response(JSON.stringify({ error: 'INVITE_EXHAUSTED' }), {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const trimmedEmail = email.trim().toLowerCase()
  const trimmedName = display_name?.trim() || trimmedEmail.split('@')[0]

  // Create the user account
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email: trimmedEmail,
    password,
    email_confirm: true,
    user_metadata: { display_name: trimmedName },
  })

  if (createErr || !created?.user) {
    return new Response(JSON.stringify({ error: createErr?.message ?? 'CREATE_FAILED' }), {
      status: 422,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const userId = created.user.id

  // Set participant role and display name
  await adminClient
    .from('profiles')
    .update({ role: 'participant', display_name: trimmedName, updated_at: new Date().toISOString() })
    .eq('id', userId)

  // Enroll in the session
  await adminClient
    .from('enrollments')
    .upsert(
      { session_id: claimedSessionId, participant_id: userId, is_active: true },
      { onConflict: 'session_id,participant_id' }
    )

  const sessionTitle = (invite.sessions as { title: string } | null)?.title ?? ''

  return new Response(JSON.stringify({
    success: true,
    session_id: claimedSessionId,
    session_title: sessionTitle,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
