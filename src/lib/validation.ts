// Shared form-field validators — used by InvitePage, UserCreateModal, and
// ResetPasswordPage so the rules (and their edge cases) live in one place.

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isValidPhone(value: string) {
  const stripped = value.replace(/\s+/g, '')
  return /^\+\d{7,15}$/.test(stripped)
}
