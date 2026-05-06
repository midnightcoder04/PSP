import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'
import { DEV_BYPASS, getDevProfile, devLogout } from '@/lib/devAuth'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
}

type AuthAction =
  | { type: 'SET_SESSION'; session: Session | null; user: User | null }
  | { type: 'SET_PROFILE'; profile: Profile | null }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SIGN_OUT' }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, session: action.session, user: action.user }
    case 'SET_PROFILE':
      return { ...state, profile: action.profile, loading: false }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'SIGN_OUT':
      return { session: null, user: null, profile: null, loading: false }
    default:
      return state
  }
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    session: null,
    user: null,
    profile: null,
    loading: true,
  })

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, display_name, email, is_active, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (error || !data) {
      dispatch({ type: 'SET_PROFILE', profile: null })
      return
    }

    dispatch({ type: 'SET_PROFILE', profile: data })
  }, [])

  useEffect(() => {
    if (DEV_BYPASS) {
      const devProfile = getDevProfile()
      if (devProfile) {
        // Synthesize a minimal session-like object so AuthGuard passes
        dispatch({ type: 'SET_SESSION', session: {} as Session, user: {} as User })
        dispatch({ type: 'SET_PROFILE', profile: devProfile })
      } else {
        dispatch({ type: 'SET_LOADING', loading: false })
      }
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SET_SESSION', session, user: session?.user ?? null })
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        dispatch({ type: 'SET_LOADING', loading: false })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      dispatch({ type: 'SET_SESSION', session, user: session?.user ?? null })
      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SIGN_OUT' })
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    if (DEV_BYPASS) {
      devLogout()
      dispatch({ type: 'SIGN_OUT' })
      return
    }
    await supabase.auth.signOut()
    dispatch({ type: 'SIGN_OUT' })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
