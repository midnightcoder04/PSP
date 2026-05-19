// Deno Edge Function — delete-user
// verify_jwt: true (set in config.toml)
//
// Permanently deletes a user from auth.users (cascades to profiles, enrollments, progress).
// Accessible to: admin only.
// Target user must be is_active = false (enforced server-side).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  // Service-role client for all privileged operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // Validate caller's JWT by passing the token explicitly — avoids relying on
  // stored session state which doesn't exist in a Deno edge function context.
  const token = authHeader.replace('Bearer ', '')
  const { data: { user: caller }, error: authErr } = await adminClient.auth.getUser(token)
  if (authErr || !caller) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED_INVALID_JWT' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verify caller is an admin
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

  // Parse request body
  let body: { user_id: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'INVALID_JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { user_id } = body
  if (!user_id || typeof user_id !== 'string') {
    return new Response(JSON.stringify({ error: 'MISSING_USER_ID' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Prevent self-deletion
  if (user_id === caller.id) {
    return new Response(JSON.stringify({ error: 'CANNOT_DELETE_SELF' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Enforce: target must be deactivated (is_active = false)
  const { data: target } = await adminClient
    .from('profiles')
    .select('is_active, role')
    .eq('id', user_id)
    .single()

  if (!target) {
    return new Response(JSON.stringify({ error: 'USER_NOT_FOUND' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (target.is_active) {
    return new Response(JSON.stringify({ error: 'USER_MUST_BE_DEACTIVATED_FIRST' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Delete from auth.users — cascades to profiles, enrollments, progress
  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user_id)
  if (deleteErr) {
    return new Response(JSON.stringify({ error: deleteErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
