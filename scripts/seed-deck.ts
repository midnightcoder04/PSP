import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// By default this script only INSERTS missing slides — admins edit deck text
// in-app, and a routine re-seed must never clobber those edits. Pass --force
// to overwrite content_json/notes from the seed file.
const force = process.argv.includes('--force')

// --only=slug[,slug] narrows the run to specific slides. Pairs with --force to
// push one content change without rewriting the other 49 slides over whatever
// admins have edited in-app.
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const only = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').filter(Boolean)) : null

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
    'Refusing to seed: a publishable key (sb_publishable_…) was supplied. Seeding requires the secret key (sb_secret_…) — RLS would block writes to deck_slides with the publishable key.'
  )
  process.exit(1)
}

console.log(`→ Supabase URL: ${supabaseUrl}`)
console.log(`→ Using key from: ${usedVar}`)
const keyPrefix = secretKey.slice(0, 12)
console.log(`→ Key prefix: ${keyPrefix}…`)
console.log(`→ Mode: ${force ? 'FORCE (overwrite existing slides)' : 'insert-missing-only'}`)
if (only) console.log(`→ Only: ${[...only].join(', ')}`)

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

interface DeckSlideSeed {
  slug: string
  kind: string
  chapter: string
  order_index: number
  content_json: unknown
  linked_exercise_slugs: string[]
  notes?: string
}

interface DeckSeedData {
  slides: DeckSlideSeed[]
}

async function seedDeck() {
  const seedPath = resolve(__dirname, '../db/seeds/deck-slides.json')
  const data: DeckSeedData = JSON.parse(readFileSync(seedPath, 'utf-8'))

  const slides = only ? data.slides.filter((s) => only.has(s.slug)) : data.slides
  if (only) {
    const missing = [...only].filter((slug) => !data.slides.some((s) => s.slug === slug))
    if (missing.length > 0) {
      console.error(`--only slug(s) not in the seed file: ${missing.join(', ')}`)
      process.exit(1)
    }
  }

  console.log(`Seeding ${slides.length} deck slides...`)

  let inserted = 0
  let skipped = 0

  for (const slide of slides) {
    const row = { ...slide, notes: slide.notes ?? null }

    const { error, data: upserted } = await supabase
      .from('deck_slides')
      .upsert(row, { onConflict: 'slug', ignoreDuplicates: !force })
      .select('slug')

    if (error) {
      console.error(`  Failed to upsert slide ${slide.slug}:`, error.message)
      process.exit(1)
    }

    if (upserted && upserted.length > 0) {
      inserted += 1
      console.log(`  ✓ ${force ? 'Upserted' : 'Inserted'}: ${slide.slug}`)
    } else {
      skipped += 1
    }
  }

  console.log(
    `\nDeck seed complete. ${inserted} ${force ? 'upserted' : 'inserted'}, ${skipped} already present${force ? '' : ' (kept as-is; use --force to overwrite)'}.`
  )
}

seedDeck().catch((err) => {
  console.error('Deck seed error:', err)
  process.exit(1)
})
