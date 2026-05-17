// Deno Edge Function — bulk-create-users
// verify_jwt: true (set in config.toml or via CLI deploy flag)
//
// Creates multiple participant accounts and optionally enrolls them in a session.
// Accessible to: admin (unlimited) and facilitator (limited by max_bulk_add).
// Always forces role = 'participant'; never allows admin/facilitator creation.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Participant {
  email: string
  display_name: string
}

interface RequestBody {
  participants: Participant[]
  session_id?: string
  temp_password: string
}

interface RowResult {
  email: string
  success: boolean
  user_id?: string
  error?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Validate caller identity via their JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED_MISSING_JWT' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Caller client — uses their JWT to identify who they are
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser()
  if (authErr || !caller) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED_INVALID_JWT' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Admin client — service role, bypasses RLS for privileged ops
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // Look up caller's profile (role + max_bulk_add)
  const { data: callerProfile, error: profileErr } = await adminClient
    .from('profiles')
    .select('role, max_bulk_add, is_active')
    .eq('id', caller.id)
    .single()

  if (profileErr || !callerProfile) {
    return new Response(JSON.stringify({ error: 'CALLER_PROFILE_NOT_FOUND' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!callerProfile.is_active) {
    return new Response(JSON.stringify({ error: 'CALLER_INACTIVE' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const isAdmin = callerProfile.role === 'admin'
  const isFacilitator = callerProfile.role === 'facilitator'

  if (!isAdmin && !isFacilitator) {
    return new Response(JSON.stringify({ error: 'FORBIDDEN_ROLE_REQUIRED' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const body: RequestBody = await req.json()
  const { participants, session_id, temp_password } = body

  if (!Array.isArray(participants) || participants.length === 0) {
    return new Response(JSON.stringify({ error: 'PARTICIPANTS_REQUIRED' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!temp_password || temp_password.length < 8) {
    return new Response(JSON.stringify({ error: 'PASSWORD_TOO_SHORT' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Facilitator-specific checks
  if (isFacilitator) {
    if (participants.length > callerProfile.max_bulk_add) {
      return new Response(JSON.stringify({
        error: 'EXCEEDS_BULK_ADD_LIMIT',
        max_bulk_add: callerProfile.max_bulk_add,
        requested: participants.length,
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (session_id) {
      const { data: session } = await adminClient
        .from('sessions')
        .select('id')
        .eq('id', session_id)
        .eq('facilitator_id', caller.id)
        .eq('is_active', true)
        .single()

      if (!session) {
        return new Response(JSON.stringify({ error: 'SESSION_NOT_FOUND_OR_NOT_YOURS' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }
  }

  // Process each participant
  const results: RowResult[] = []

  for (const p of participants) {
    const email = p.email.trim().toLowerCase()
    const displayName = p.display_name?.trim() || email.split('@')[0]

    if (!email || !email.includes('@')) {
      results.push({ email, success: false, error: 'INVALID_EMAIL' })
      continue
    }

    // Create auth user via admin API
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: temp_password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    })

    if (createErr || !created?.user) {
      results.push({ email, success: false, error: createErr?.message ?? 'CREATE_FAILED' })
      continue
    }

    const userId = created.user.id

    // Ensure role = participant and set display_name (trigger creates the row)
    await adminClient
      .from('profiles')
      .update({ role: 'participant', display_name: displayName, updated_at: new Date().toISOString() })
      .eq('id', userId)

    // Enroll in session if requested
    if (session_id) {
      await adminClient
        .from('enrollments')
        .upsert(
          { session_id, participant_id: userId, is_active: true },
          { onConflict: 'session_id,participant_id' }
        )
    }

    results.push({ email, success: true, user_id: userId })
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
