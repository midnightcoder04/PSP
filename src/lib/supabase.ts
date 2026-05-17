import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
const legacyAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (legacyAnonKey && !publishableKey && import.meta.env.DEV) {
  console.warn(
    '[supabase] VITE_SUPABASE_ANON_KEY is deprecated. Rename your env var to VITE_SUPABASE_PUBLISHABLE_KEY (sb_publishable_… prefix).'
  )
}

const browserKey = publishableKey ?? legacyAnonKey ?? ''

if (browserKey.startsWith('sb_secret_')) {
  throw new Error(
    '[supabase] A secret key was detected in browser env. Secret keys (sb_secret_…) MUST NOT be exposed to the client. Use VITE_SUPABASE_PUBLISHABLE_KEY instead.'
  )
}

if (!supabaseUrl || !browserKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables'
  )
}

export const supabase = createClient<Database>(supabaseUrl, browserKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
