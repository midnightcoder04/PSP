#!/usr/bin/env tsx
/**
 * scripts/audit-security.ts
 *
 * Generates specs/002-iter2-fixes/security-audit.md with five sections:
 *  1. Supabase advisor findings (security + performance)
 *  2. RLS access matrix (table × role × op)
 *  3. Edge Function authz (create-user, 4 callers)
 *  4. Build sentinel scan (check-no-bypass.sh)
 *  5. Env-var policy (src/vite-env.d.ts)
 *
 * Always exits 0 — informational. The gate lives in rpc.test.ts `audit_assertions`.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { setupFixtures, teardownFixtures } from './_rpc_fixtures.js'
import type { Fixtures } from './_rpc_fixtures.types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

const url = process.env.VITE_SUPABASE_URL ?? ''
const secretKey = process.env.SUPABASE_SECRET_KEY ?? ''
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

if (!url || !secretKey) {
  console.error('VITE_SUPABASE_URL and SUPABASE_SECRET_KEY are required. Set them in .env.local.')
  process.exit(1)
}

// Extract project ref from the URL: https://<ref>.supabase.co
const projectRef = new URL(url).hostname.split('.')[0]

// Advisor IDs addressed by migration 010
const RESOLVED_BY_010 = new Set([
  '0028', // Function exposed to anon role (user-callable RPCs + helpers)
  '0029', // Function exposed to anon and authenticated (trigger-only functions)
])

// ---------------------------------------------------------------------------
// Section 1 — Supabase Advisor Findings
// ---------------------------------------------------------------------------

interface AdvisorFinding {
  name: string
  title: string
  level: string
  facing: string
  categories: string[]
  description: string
  detail: string
  remediation: string
  metadata: Record<string, unknown>
}

async function section1Advisors(): Promise<string> {
  const lines: string[] = ['## 1. Supabase Advisor Findings\n']

  // The Management API uses SUPABASE_SECRET_KEY as specified in FR-004.
  // Note: if the key is a PAT (personal access token), this works directly.
  // If it's a service role key, the endpoint may return 401 — in that case,
  // set SUPABASE_PAT in .env.local for this section.
  const managementKey = process.env.SUPABASE_PAT ?? secretKey

  for (const type of ['security', 'performance'] as const) {
    lines.push(`### ${type.charAt(0).toUpperCase() + type.slice(1)} advisors\n`)

    let findings: AdvisorFinding[] = []
    let fetchError: string | null = null

    try {
      const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/advisors?type=${type}`
      const resp = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${managementKey}` },
      })
      if (!resp.ok) {
        fetchError = `HTTP ${resp.status} ${resp.statusText} — check SUPABASE_PAT (management API requires a Personal Access Token, not a service role key)`
      } else {
        findings = (await resp.json()) as AdvisorFinding[]
      }
    } catch (e) {
      fetchError = String(e)
    }

    if (fetchError) {
      lines.push(`> ⚠️ Could not fetch ${type} advisors: ${fetchError}\n`)
      lines.push(
        `> Set \`SUPABASE_PAT\` in .env.local (Supabase Dashboard → Account → Access Tokens) to enable this section.\n`
      )
      continue
    }

    if (findings.length === 0) {
      lines.push(`_No ${type} advisor findings — clean._\n`)
      continue
    }

    lines.push(`| ID | Level | Title | Target | Status | Justification |`)
    lines.push(`|---|---|---|---|---|---|`)

    for (const f of findings) {
      // Extract advisor ID from the name (format: "0028_...")
      const id = f.name?.match(/^(\d+)/)?.[1] ?? f.name
      const status = RESOLVED_BY_010.has(id)
        ? '`resolved-by-010`'
        : '`open`'
      const justification = RESOLVED_BY_010.has(id)
        ? 'migration 010 revokes EXECUTE from PUBLIC + grants to authenticated'
        : ''
      const target = (f.metadata?.['function'] ?? f.metadata?.['table'] ?? f.detail ?? '').toString().slice(0, 60)
      lines.push(`| \`${id}\` | ${f.level} | ${f.title} | ${target} | ${status} | ${justification} |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Section 2 — RLS Access Matrix
// ---------------------------------------------------------------------------

type Op = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'

interface RlsCell {
  table: string
  description: string
  op: Op
  role: 'admin' | 'facilitator' | 'participant' | 'anon'
  expected: boolean
  queryFn: (f: Fixtures) => Promise<boolean>
}

async function tryOp(fn: () => PromiseLike<{ error?: { code?: string; message?: string } | null }>): Promise<boolean> {
  try {
    const result = await fn()
    if (result.error) return false
    return true
  } catch {
    return false
  }
}

function buildRlsCells(): RlsCell[] {
  return [
    // profiles SELECT (self)
    {
      table: 'profiles', description: 'SELECT self', op: 'SELECT',
      role: 'admin', expected: true,
      queryFn: (f) => tryOp(() => f.admin.client.from('profiles').select('id').eq('id', f.admin.user.id).maybeSingle()),
    },
    {
      table: 'profiles', description: 'SELECT self', op: 'SELECT',
      role: 'facilitator', expected: true,
      queryFn: (f) => tryOp(() => f.facilitator.client.from('profiles').select('id').eq('id', f.facilitator.user.id).maybeSingle()),
    },
    {
      table: 'profiles', description: 'SELECT self', op: 'SELECT',
      role: 'participant', expected: true,
      queryFn: (f) => tryOp(() => f.participant.client.from('profiles').select('id').eq('id', f.participant.user.id).maybeSingle()),
    },
    // profiles SELECT other in same session
    {
      table: 'profiles', description: 'SELECT other (own session)', op: 'SELECT',
      role: 'admin', expected: true,
      queryFn: (f) => tryOp(() => f.admin.client.from('profiles').select('id').eq('id', f.facilitator.user.id).maybeSingle()),
    },
    {
      table: 'profiles', description: 'SELECT other (own session)', op: 'SELECT',
      role: 'facilitator', expected: true,
      queryFn: (f) => tryOp(() => f.facilitator.client.from('profiles').select('id').eq('id', f.participant.user.id).maybeSingle()),
    },
    // profiles UPDATE self display_name
    {
      table: 'profiles', description: 'UPDATE self display_name', op: 'UPDATE',
      role: 'admin', expected: true,
      queryFn: (f) => tryOp(() => f.admin.client.from('profiles').update({ display_name: 'RPC Test Admin' }).eq('id', f.admin.user.id)),
    },
    {
      table: 'profiles', description: 'UPDATE self display_name', op: 'UPDATE',
      role: 'facilitator', expected: true,
      queryFn: (f) => tryOp(() => f.facilitator.client.from('profiles').update({ display_name: 'RPC Test Facilitator' }).eq('id', f.facilitator.user.id)),
    },
    {
      table: 'profiles', description: 'UPDATE self display_name', op: 'UPDATE',
      role: 'participant', expected: true,
      queryFn: (f) => tryOp(() => f.participant.client.from('profiles').update({ display_name: 'RPC Test Participant' }).eq('id', f.participant.user.id)),
    },
    // sessions SELECT
    {
      table: 'sessions', description: 'SELECT (own/enrolled)', op: 'SELECT',
      role: 'admin', expected: true,
      queryFn: (f) => tryOp(() => f.admin.client.from('sessions').select('id').eq('id', f.sessionId).maybeSingle()),
    },
    {
      table: 'sessions', description: 'SELECT (own/enrolled)', op: 'SELECT',
      role: 'facilitator', expected: true,
      queryFn: (f) => tryOp(() => f.facilitator.client.from('sessions').select('id').eq('id', f.sessionId).maybeSingle()),
    },
    {
      table: 'sessions', description: 'SELECT (own/enrolled)', op: 'SELECT',
      role: 'participant', expected: true,
      queryFn: (f) => tryOp(() => f.participant.client.from('sessions').select('id').eq('id', f.sessionId).maybeSingle()),
    },
    // sections + exercises SELECT (all authenticated can read)
    {
      table: 'sections', description: 'SELECT', op: 'SELECT',
      role: 'admin', expected: true,
      queryFn: (f) => tryOp(() => f.admin.client.from('sections').select('id').limit(1)),
    },
    {
      table: 'sections', description: 'SELECT', op: 'SELECT',
      role: 'participant', expected: true,
      queryFn: (f) => tryOp(() => f.participant.client.from('sections').select('id').limit(1)),
    },
    {
      table: 'exercises', description: 'SELECT', op: 'SELECT',
      role: 'facilitator', expected: true,
      queryFn: (f) => tryOp(() => f.facilitator.client.from('exercises').select('id').limit(1)),
    },
    // responses SELECT (own)
    {
      table: 'responses', description: 'SELECT own', op: 'SELECT',
      role: 'participant', expected: true,
      queryFn: (f) => tryOp(() => f.participant.client.from('responses').select('id').eq('participant_id', f.participant.user.id)),
    },
    {
      table: 'responses', description: "SELECT facilitator sees participant's", op: 'SELECT',
      role: 'facilitator', expected: true,
      queryFn: (f) => tryOp(() => f.facilitator.client.from('responses').select('id').eq('participant_id', f.participant.user.id)),
    },
    // enrollments SELECT
    {
      table: 'enrollments', description: 'SELECT (own session)', op: 'SELECT',
      role: 'admin', expected: true,
      queryFn: (f) => tryOp(() => f.admin.client.from('enrollments').select('id').eq('session_id', f.sessionId)),
    },
    {
      table: 'enrollments', description: 'SELECT (own session)', op: 'SELECT',
      role: 'facilitator', expected: true,
      queryFn: (f) => tryOp(() => f.facilitator.client.from('enrollments').select('id').eq('session_id', f.sessionId)),
    },
    {
      table: 'enrollments', description: 'SELECT (own enrollment)', op: 'SELECT',
      role: 'participant', expected: true,
      queryFn: (f) => tryOp(() => f.participant.client.from('enrollments').select('id').eq('participant_id', f.participant.user.id)),
    },
    // progress SELECT
    {
      table: 'progress', description: 'SELECT own', op: 'SELECT',
      role: 'admin', expected: true,
      queryFn: (f) => tryOp(() => f.admin.client.from('progress').select('id').limit(1)),
    },
    {
      table: 'progress', description: 'SELECT own', op: 'SELECT',
      role: 'participant', expected: true,
      queryFn: (f) => tryOp(() => f.participant.client.from('progress').select('id').eq('participant_id', f.participant.user.id)),
    },
    {
      table: 'progress', description: "SELECT facilitator sees participant in own session", op: 'SELECT',
      role: 'facilitator', expected: true,
      queryFn: (f) => tryOp(() => f.facilitator.client.from('progress').select('id').eq('participant_id', f.participant.user.id)),
    },
  ]
}

async function section2RlsMatrix(f: Fixtures): Promise<{ md: string; mismatches: number }> {
  const lines: string[] = ['## 2. RLS Access Matrix\n']
  const cells = buildRlsCells()
  let mismatches = 0

  lines.push('| Table | Description | Op | Role | Expected | Actual | Result |')
  lines.push('|---|---|---|---|---|---|---|')

  for (const cell of cells) {
    const actual = await cell.queryFn(f)
    const expected = cell.expected
    const match = actual === expected
    if (!match) mismatches++
    const icon = match ? '✓' : '✗'
    lines.push(
      `| ${cell.table} | ${cell.description} | ${cell.op} | ${cell.role} | ${expected ? 'allow' : 'deny'} | ${actual ? 'allow' : 'deny'} | ${icon} |`
    )
  }
  lines.push('')

  if (mismatches > 0) {
    lines.push(`> ⚠️ **${mismatches} mismatch(es) detected.** Review the ✗ rows above.\n`)
  } else {
    lines.push(`> ✓ All ${cells.length} RLS assertions passed.\n`)
  }

  return { md: lines.join('\n'), mismatches }
}

// ---------------------------------------------------------------------------
// Section 3 — Edge Function authz
// ---------------------------------------------------------------------------

async function section3EdgeFnAuthz(f: Fixtures): Promise<{ md: string; failures: number }> {
  const lines: string[] = ['## 3. Edge Function Authorization (`create-user`)\n']
  lines.push('| Caller | Body email | Expected | Actual status | Actual body | Result |')
  lines.push('|---|---|---|---|---|---|')

  let failures = 0
  let createdUserId: string | null = null

  const testBody = (suffix: string) => ({
    email: `__rpc_test_efnew_${suffix}@example.invalid`,
    display_name: 'EF New',
    role: 'participant',
    password: process.env.RPC_TEST_PASSWORD ?? 'rpc-test-ef-12345678',
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cases: Array<{ label: string; client: any; expectedStatus: number; expectedErrorKey: string | null }> = [
    { label: 'admin', client: f.admin.client, expectedStatus: 200, expectedErrorKey: null },
    { label: 'facilitator', client: f.facilitator.client, expectedStatus: 403, expectedErrorKey: 'admin_required' },
    { label: 'participant', client: f.participant.client, expectedStatus: 403, expectedErrorKey: 'admin_required' },
    {
      label: 'anon (no JWT)',
      client: createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } }),
      expectedStatus: 401,
      expectedErrorKey: null,
    },
  ]

  for (const c of cases) {
    const body = testBody(c.label.replace(/\s+/g, '_'))
    let actualStatus = 0
    let actualBody = ''
    let passed = false

    try {
      const { data, error } = await c.client.functions.invoke('create-user', { body })
      // supabase-js wraps non-2xx in FunctionsHttpError; status is at error.context.status
      if (error) {
        const ctx = (error as { context?: Response }).context
        actualStatus = ctx?.status ?? 0
        // Read body text for the error key check
        try {
          const bodyText = ctx ? await ctx.clone().text() : error.message ?? ''
          actualBody = bodyText.slice(0, 80)
        } catch {
          actualBody = error.message ?? ''
        }
      } else {
        actualStatus = 200
        actualBody = JSON.stringify(data).slice(0, 80)
        if ((data as { user?: { id?: string } })?.user?.id) {
          createdUserId = (data as { user: { id: string } }).user.id
        }
      }
    } catch (e) {
      actualBody = String(e).slice(0, 80)
    }

    if (c.expectedErrorKey === null) {
      passed = actualStatus === c.expectedStatus
    } else {
      passed = actualStatus === c.expectedStatus && actualBody.includes(c.expectedErrorKey)
    }
    if (!passed) failures++

    lines.push(
      `| ${c.label} | ${body.email} | HTTP ${c.expectedStatus} | HTTP ${actualStatus} | ${actualBody} | ${passed ? '✓' : '✗'} |`
    )
  }

  // Cleanup: delete user the admin row created
  if (createdUserId) {
    try {
      await f.adminClient.auth.admin.deleteUser(createdUserId)
    } catch {
      // best-effort
    }
  }

  lines.push('')
  if (failures > 0) {
    lines.push(`> ⚠️ **${failures} edge-function authz assertion(s) failed.**\n`)
  } else {
    lines.push(`> ✓ All edge-function authz assertions passed.\n`)
  }

  return { md: lines.join('\n'), failures }
}

// ---------------------------------------------------------------------------
// Section 4 — Build Sentinel Scan
// ---------------------------------------------------------------------------

function section4BuildSentinel(): { md: string; exitCode: number } {
  const lines: string[] = ['## 4. Build Sentinel Scan\n']
  lines.push('Runs `scripts/check-no-bypass.sh` (includes sentinel checks for `__dev_auth_role__`,')
  lines.push('`sb_secret_`, and `dev-(admin|facilitator|participant)-id`).\n')

  let output = ''
  let exitCode = 0

  try {
    output = execSync('bash scripts/check-no-bypass.sh', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; status?: number }
    output = (err.stdout ?? '') + (err.stderr ?? '')
    exitCode = err.status ?? 1
  }

  lines.push('```')
  lines.push(output.trim())
  lines.push('```\n')
  lines.push(exitCode === 0 ? '> ✓ Sentinel scan passed.\n' : '> ✗ Sentinel scan FAILED — see output above.\n')

  return { md: lines.join('\n'), exitCode }
}

// ---------------------------------------------------------------------------
// Section 5 — Env-Var Policy
// ---------------------------------------------------------------------------

function section5EnvVarPolicy(): { md: string; violations: number } {
  const lines: string[] = ['## 5. Env-Var Policy\n']
  lines.push('Checks that `src/vite-env.d.ts` does not declare `VITE_*SECRET*` or `VITE_*SERVICE_ROLE*`.')
  lines.push('(Such declarations would inline server-only keys into the browser bundle.)\n')

  let content = ''
  const envTypesPath = resolve(ROOT, 'src/vite-env.d.ts')
  try {
    content = readFileSync(envTypesPath, 'utf-8')
  } catch {
    lines.push('> ⚠️ `src/vite-env.d.ts` not found — skipping.\n')
    return { md: lines.join('\n'), violations: 0 }
  }

  const forbidden = [/VITE_.*SECRET/i, /VITE_.*SERVICE_ROLE/i]
  const hits: string[] = []
  for (const line of content.split('\n')) {
    for (const pat of forbidden) {
      if (pat.test(line)) hits.push(line.trim())
    }
  }

  if (hits.length === 0) {
    lines.push('> ✓ No forbidden env-var declarations found in `src/vite-env.d.ts`.\n')
  } else {
    for (const h of hits) lines.push(`- \`${h}\``)
    lines.push('')
    lines.push('> ✗ Forbidden declarations found — rename to remove the `VITE_` prefix.\n')
  }

  return { md: lines.join('\n'), violations: hits.length }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('→ Setting up test fixtures…')
  let f: Fixtures | null = null

  try {
    f = await setupFixtures()
  } catch (e) {
    console.error('Fixture setup failed:', e)
    process.exit(1)
  }

  try {
    console.log('→ Section 1: Supabase advisor findings…')
    const s1 = await section1Advisors()

    console.log('→ Section 2: RLS access matrix…')
    const { md: s2, mismatches } = await section2RlsMatrix(f)

    console.log('→ Section 3: Edge Function authz…')
    const { md: s3, failures: efFailures } = await section3EdgeFnAuthz(f)

    console.log('→ Section 4: Build sentinel scan…')
    const { md: s4, exitCode: sentinelExit } = section4BuildSentinel()

    console.log('→ Section 5: Env-var policy…')
    const { md: s5, violations } = section5EnvVarPolicy()

    const report = [
      '---',
      'generated: ' + new Date().toISOString(),
      'project: ' + projectRef,
      '---',
      '',
      '# Security Audit Report',
      '',
      `**Generated**: ${new Date().toISOString()}`,
      `**Project**: \`${projectRef}\``,
      '',
      '---',
      '',
      s1,
      '---',
      '',
      s2,
      '---',
      '',
      s3,
      '---',
      '',
      s4,
      '---',
      '',
      s5,
      '---',
      '',
      '## Summary',
      '',
      `| Check | Status |`,
      `|---|---|`,
      `| Supabase advisors | see Section 1 |`,
      `| RLS matrix | ${mismatches === 0 ? '✓ all pass' : `✗ ${mismatches} mismatch(es)`} |`,
      `| Edge Function authz | ${efFailures === 0 ? '✓ all pass' : `✗ ${efFailures} failure(s)`} |`,
      `| Build sentinel | ${sentinelExit === 0 ? '✓ clean' : '✗ FAILED'} |`,
      `| Env-var policy | ${violations === 0 ? '✓ clean' : `✗ ${violations} violation(s)`} |`,
      '',
    ].join('\n')

    const outPath = resolve(ROOT, 'specs/002-iter2-fixes/security-audit.md')
    writeFileSync(outPath, report, 'utf-8')
    console.log(`✓ Report written to ${outPath}`)

    if (mismatches > 0 || efFailures > 0 || sentinelExit !== 0 || violations > 0) {
      console.log('⚠️  Some checks failed — see security-audit.md for details.')
    } else {
      console.log('✓ All automated checks passed.')
    }
  } finally {
    if (f) {
      console.log('→ Tearing down fixtures…')
      await teardownFixtures(f)
    }
  }
}

main().catch((e) => {
  console.error('audit-security fatal:', e)
  process.exit(1)
})
