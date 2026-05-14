export const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  RESET_PASSWORD: '/reset-password',
  // Admin
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_DETAIL: '/admin/users/:userId',
  ADMIN_SESSIONS: '/admin/sessions',
  ADMIN_SESSION_DETAIL: '/admin/sessions/:id',
  ADMIN_TESTIMONIALS: '/admin/testimonials',
  // Facilitator
  FACILITATOR: '/facilitator',
  FACILITATOR_SESSION_DETAIL: '/facilitator/sessions/:id',
  FACILITATOR_TESTIMONIALS: '/facilitator/testimonials',
  // Course (participant)
  COURSE: '/course',
  COURSE_SECTION: '/course/:sectionSlug',
  COURSE_HISTORY: '/course/history',
  COURSE_COMPLETE: '/course/complete',
} as const

export const SECTION_SLUGS = [
  'personality',
  'attitudes',
  'values',
  'roles',
  'skills',
  'goal-setting',
] as const

export type SectionSlug = (typeof SECTION_SLUGS)[number]

export const ROLE = {
  ADMIN: 'admin',
  FACILITATOR: 'facilitator',
  PARTICIPANT: 'participant',
} as const

export type Role = (typeof ROLE)[keyof typeof ROLE]

export const EXERCISE_TYPE = {
  CHECKBOX: 'checkbox',
  TEXT: 'text',
  TABLE: 'table',
  RANKING: 'ranking',
  INFO: 'info',
  STRUCTURED_TEXT: 'structured-text',
  RATING_PICKER: 'rating-picker',
} as const

export type ExerciseType = (typeof EXERCISE_TYPE)[keyof typeof EXERCISE_TYPE]
