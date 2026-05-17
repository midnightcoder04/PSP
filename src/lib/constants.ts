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

// 9-section vocabulary (post-migration 014). nextSectionSlug walks this array to
// resolve the "Continue → next section" target; the order must match
// public.sections.order_index (1..9) per specs/004-content-restructure/data-model.md.
export const SECTION_SLUGS = [
  'personality',
  'attitude',
  'values',
  'roles-and-demands',
  'transferable-skills',
  'specific-goals',
  'goal-impact-matrix',
  'visualization',
  'removing-obstacles-achieving-goals',
] as const

export type SectionSlug = (typeof SECTION_SLUGS)[number]

// Group metadata for the three pedagogical phases (004-content-restructure US1).
// Single source of truth for /course group bands and the section-page group-context affordance.
export const GROUP_SLUGS = ['self-awareness', 'goal-setting', 'strategic-planning'] as const

export type GroupSlug = (typeof GROUP_SLUGS)[number]

export interface GroupMeta {
  title: string
  description: string
  order: number
}

export const GROUP_META: Record<GroupSlug, GroupMeta> = {
  'self-awareness': {
    title: 'Self Awareness',
    description: 'The five PSP™ Filters that surface who you already are.',
    order: 1,
  },
  'goal-setting': {
    title: 'Goal Setting',
    description: 'Naming what you want, weighing trade-offs, and visualising the outcome.',
    order: 2,
  },
  'strategic-planning': {
    title: 'Strategic Planning',
    description: 'Removing obstacles and committing to actions.',
    order: 3,
  },
}

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
