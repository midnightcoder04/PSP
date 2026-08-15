// Deno Edge Function — create-user
// verify_jwt: true (set in config.toml)
//
// Creates a single account (any role) with an admin-set initial password.
// Accessible to: admin only.
// Sets must_reset_password so the invitee is forced through the
// password-reset page (which also collects phone) on first sign-in.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  email: string
  display_name: string
  role: 'admin' | 'facilitator' | 'participant'
  password: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED_MISSING_JWT' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Admin client — service role, bypasses RLS for privileged ops
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // Validate caller's JWT by passing the token explicitly (avoids relying on
  // stored session state which doesn't exist in a Deno edge function context)
  const token = authHeader.replace('Bearer ', '')
  const { data: { user: caller }, error: authErr } = await adminClient.auth.getUser(token)
  if (authErr || !caller) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED_INVALID_JWT' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // This function can assign any role (including admin/facilitator), so the
  // caller must be an admin — unlike bulk-create-users, which facilitators
  // may also call but which always forces role = 'participant'.
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'FORBIDDEN_ADMIN_ONLY' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const body: RequestBody = await req.json()
  const { email, display_name, role, password } = body

  const trimmedEmail = email?.trim().toLowerCase()
  const trimmedName = display_name?.trim()
  const validRoles: RequestBody['role'][] = ['admin', 'facilitator', 'participant']

  if (
    !trimmedEmail ||
    !trimmedEmail.includes('@') ||
    !trimmedName ||
    !password ||
    password.length < 8 ||
    !validRoles.includes(role)
  ) {
    return new Response(JSON.stringify({ error: 'MISSING_OR_INVALID_FIELDS' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

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

  // Set role, display name, and force a password/phone reset on first login
  // (trigger already created the row on auth.users insert)
  await adminClient
    .from('profiles')
    .update({
      role,
      display_name: trimmedName,
      must_reset_password: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return new Response(JSON.stringify({ user: { id: userId } }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
