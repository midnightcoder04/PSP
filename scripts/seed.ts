import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface ExerciseSeed {
  slug: string
  title: string
  type: string
  order_index: number
  is_scored: boolean
  attribution: string | null
  content_json: unknown
}

interface SectionSeed {
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  order_index: number
  icon_name: string | null
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
