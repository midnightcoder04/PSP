import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import type { Role } from '@/lib/constants'
import { getRoleHome } from '@/lib/roleHome'
import { Spinner } from '@/components/ui/Spinner'

interface AuthGuardProps {
  children: ReactNode
  requiredRole?: Role
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading || (!!session && !profile)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session || !profile?.is_active) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  // Accounts created with a facilitator/admin-set temp password must set
  // their own password (and phone, if missing) before going anywhere else.
  if (profile.must_reset_password) {
    return <Navigate to={ROUTES.RESET_PASSWORD} replace />
  }

  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to={getRoleHome(profile.role)} replace />
  }

  return <>{children}</>
}
