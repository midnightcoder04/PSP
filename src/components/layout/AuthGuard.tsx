import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/constants'
import type { Role } from '@/lib/constants'
import { Spinner } from '@/components/ui/Spinner'

interface AuthGuardProps {
  children: ReactNode
  requiredRole?: Role
}

const ROLE_HOME: Record<Role, string> = {
  admin: ROUTES.ADMIN,
  facilitator: ROUTES.FACILITATOR,
  participant: ROUTES.COURSE,
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!session || !profile?.is_active) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (requiredRole && profile.role !== requiredRole) {
    const home = ROLE_HOME[profile.role] ?? ROUTES.LOGIN
    return <Navigate to={home} replace />
  }

  return <>{children}</>
}
