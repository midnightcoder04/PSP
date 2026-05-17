import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''

const secretKey =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.VITE_SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  ''

const usedVar = process.env.SUPABASE_SECRET_KEY
  ? 'SUPABASE_SECRET_KEY'
  : process.env.VITE_SUPABASE_SECRET_KEY
    ? 'VITE_SUPABASE_SECRET_KEY (⚠ rename to SUPABASE_SECRET_KEY — VITE_ prefix would leak this key into a browser build)'
    : process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'SUPABASE_SERVICE_ROLE_KEY (legacy)'
      : '(none)'

if (!supabaseUrl || !secretKey) {
  console.error('Missing VITE_SUPABASE_URL or a server-side secret key.')
  console.error('Set SUPABASE_SECRET_KEY (sb_secret_… prefix) in .env.local or your shell.')
  process.exit(1)
}

if (secretKey.startsWith('sb_publishable_')) {
  console.error(
    'Refusing to seed: a publishable key (sb_publishable_…) was supplied. Seeding requires the secret key (sb_secret_…) — RLS would block writes to sections/exercises with the publishable key.'
  )
  process.exit(1)
}

console.log(`→ Supabase URL: ${supabaseUrl}`)
console.log(`→ Using key from: ${usedVar}`)
const keyPrefix = secretKey.slice(0, 12)
console.log(`→ Key prefix: ${keyPrefix}…`)

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

interface ExerciseSeed {
  slug: string
  title: string
  type: string
  order_index: number
  is_scored: boolean
  attribution: string | null
  content_json: unknown
}

interface SectionFramingSeed {
  opening_quote: { text: string; attribution: string }
  opening_question: string
  facilitator_says: string
  why_it_matters: string
  closing_reflection: string
  bridge_to_next: string | null
}

interface SectionSeed {
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  order_index: number
  icon_name: string | null
  framing?: SectionFramingSeed | null
  exercises: ExerciseSeed[]
}

interface SeedData {
  sections: SectionSeed[]
}

async function seed() {
  const seedPath = resolve(__dirname, '../db/seeds/course-content.json')
  const data: SeedData = JSON.parse(readFileSync(seedPath, 'utf-8'))

  console.log(`Seeding ${data.sections.length} sections...`)

  for (const section of data.sections) {
    const { exercises, ...sectionData } = section

    const { data: upsertedSection, error: sectionError } = await supabase
      .from('sections')
      .upsert(sectionData, { onConflict: 'slug' })
      .select('id')
      .single()

    if (sectionError) {
      console.error(`Failed to upsert section ${section.slug}:`, sectionError.message)
      process.exit(1)
    }

    const sectionId = upsertedSection.id
    console.log(`  ✓ Section: ${section.title} (${sectionId})`)

    for (const exercise of exercises) {
      const { error: exError } = await supabase
        .from('exercises')
        .upsert(
          { ...exercise, section_id: sectionId },
          { onConflict: 'section_id,slug' }
        )

      if (exError) {
        console.error(`    Failed to upsert exercise ${exercise.slug}:`, exError.message)
        process.exit(1)
      }
    }

    console.log(`    ✓ ${exercises.length} exercises seeded`)
  }

  console.log('\nSeed complete.')
}

seed().catch((err) => {
  console.error('Seed error:', err)
  process.exit(1)
})
