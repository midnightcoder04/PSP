import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

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
  refreshProfile: () => Promise<void>
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
      .select('id, role, display_name, email, phone, is_active, max_bulk_add, can_present, must_reset_password, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (error || !data) {
      dispatch({ type: 'SET_PROFILE', profile: null })
      return
    }

    dispatch({ type: 'SET_PROFILE', profile: data })
  }, [])

  useEffect(() => {
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
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session?.user) {
        fetchProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SIGN_OUT' })
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    dispatch({ type: 'SIGN_OUT' })
  }, [])

  // Re-fetches the current user's profile without a full sign-out/sign-in —
  // used after ResetPasswordPage updates phone/must_reset_password so the
  // rest of the app (AuthGuard included) sees the change immediately.
  const refreshProfile = useCallback(async () => {
    if (state.user) await fetchProfile(state.user.id)
  }, [state.user, fetchProfile])

  return (
    <AuthContext.Provider value={{ ...state, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
