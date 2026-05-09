import type { Profile } from '@/types/database'

export const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'true'

const DEV_ROLE_KEY = '__dev_auth_role__'

// Defence-in-depth: if dev-bypass was previously enabled and is now off,
// clear the stale role pointer so no synthetic id (e.g. dev-participant-id)
// can leak into a real Supabase request after a config change.
if (!DEV_BYPASS && typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem(DEV_ROLE_KEY)
  } catch {
    // localStorage may be unavailable (SSR, privacy mode) — safe to ignore.
  }
}

const DEV_PROFILES: Record<string, Profile> = {
  admin: {
    id: 'dev-admin-id',
    role: 'admin',
    display_name: 'Dev Admin',
    email: 'admin@dev.local',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  facilitator: {
    id: 'dev-facilitator-id',
    role: 'facilitator',
    display_name: 'Dev Facilitator',
    email: 'facilitator@dev.local',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  participant: {
    id: 'dev-participant-id',
    role: 'participant',
    display_name: 'Dev Participant',
    email: 'participant@dev.local',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
}

// email "test" → participant, "admin" → admin, "facilitator" → facilitator
export function resolveDevRole(email: string): 'admin' | 'facilitator' | 'participant' {
  if (email === 'admin') return 'admin'
  if (email === 'facilitator') return 'facilitator'
  return 'participant'
}

export function devLogin(role: 'admin' | 'facilitator' | 'participant') {
  localStorage.setItem(DEV_ROLE_KEY, role)
}

export function devLogout() {
  localStorage.removeItem(DEV_ROLE_KEY)
}

export function getDevProfile(): Profile | null {
  const role = localStorage.getItem(DEV_ROLE_KEY) as 'admin' | 'facilitator' | 'participant' | null
  return role ? DEV_PROFILES[role] : null
}
