import { ROUTES } from './constants'
import type { Role } from './constants'

// Single source of truth for "where does this role land after auth" —
// shared by LoginPage (post sign-in), AuthGuard (wrong-role redirect), and
// ResetPasswordPage (post password/phone setup).
export function getRoleHome(role: Role): string {
  switch (role) {
    case 'admin':
      return ROUTES.ADMIN
    case 'facilitator':
      return ROUTES.FACILITATOR
    case 'participant':
      return ROUTES.COURSE
    default:
      return ROUTES.LOGIN
  }
}
