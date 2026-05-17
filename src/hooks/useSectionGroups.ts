import { useMemo } from 'react'
import { GROUP_META, GROUP_SLUGS, type GroupSlug } from '@/lib/constants'
import type { Section, SectionGroup } from '@/types/database'

// useSectionGroups — pure derivation from the existing `sections` fetch.
// Groups sections by their group_slug, returns an ordered Group[] (per GROUP_META.order).
// Sections without a recognised group_slug fall into an 'unassigned' band rendered last
// (per specs/004-content-restructure/spec.md Edge Cases). In non-production builds, the
// presence of unassigned sections also emits a single console.warn so accidental
// misconfiguration is visible during dev.
export function useSectionGroups(sections: Section[]): SectionGroup[] {
  return useMemo(() => {
    const groupBuckets = new Map<GroupSlug | 'unassigned', Section[]>()
    for (const slug of GROUP_SLUGS) groupBuckets.set(slug, [])
    const unassigned: Section[] = []

    for (const section of sections) {
      const candidate = section.group_slug
      if (candidate && (GROUP_SLUGS as readonly string[]).includes(candidate)) {
        groupBuckets.get(candidate as GroupSlug)!.push(section)
      } else {
        unassigned.push(section)
      }
    }

    if (unassigned.length > 0 && import.meta.env.MODE !== 'production') {
      // Visible in dev consoles only; avoids noise in prod.
      console.warn(
        `[useSectionGroups] ${unassigned.length} section(s) have an unrecognised group_slug; rendered in fallback "Unassigned" band:`,
        unassigned.map((s) => s.slug),
      )
    }

    const groups: SectionGroup[] = GROUP_SLUGS.map((slug) => {
      const meta = GROUP_META[slug]
      return {
        slug,
        title: meta.title,
        description: meta.description,
        order: meta.order,
        sections: (groupBuckets.get(slug) ?? []).sort(
          (a, b) => a.order_index - b.order_index,
        ),
      }
    })

    if (unassigned.length > 0) {
      groups.push({
        slug: 'unassigned',
        title: 'Unassigned',
        description: 'Sections not yet grouped.',
        order: GROUP_SLUGS.length + 1,
        sections: unassigned.sort((a, b) => a.order_index - b.order_index),
      })
    }

    return groups
  }, [sections])
}
