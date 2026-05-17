// @vitest-environment node
//
// Hosted-DB RLS contract tests for the testimonials table (iteration 4 / US5).
//
// Auto-skip when integration credentials are absent (mirrors scripts/rpc.test.ts).
//
// Uses the same _rpc_fixtures helpers — admin/facilitator/participant clients
// signed in with real JWTs, plus a service-role admin client for cleanup.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { setupFixtures, teardownFixtures } from './_rpc_fixtures.js'
import type { Fixtures } from './_rpc_fixtures.types.js'

const url = process.env.VITE_SUPABASE_URL ?? ''
const secretKey = process.env.SUPABASE_SECRET_KEY ?? ''
const hasIntegrationCreds = Boolean(url && secretKey)
const itTest = hasIntegrationCreds ? it : it.skip

let F: Fixtures
let testimonialId: string | null = null

beforeAll(async () => {
  if (!hasIntegrationCreds) return
  F = await setupFixtures()
}, 30_000)

afterAll(async () => {
  if (!hasIntegrationCreds || !F) return
  if (testimonialId) {
    await F.adminClient.from('testimonials').delete().eq('id', testimonialId)
  }
  // Also clean up any rows by participant_id in case earlier tests inserted them
  await F.adminClient
    .from('testimonials')
    .delete()
    .eq('participant_id', F.participant.user.id)
  await teardownFixtures(F)
}, 15_000)

describe('testimonials smoke', () => {
  it('mounts', () => expect(true).toBe(true))
})

describe('testimonials/insert', () => {
  itTest('participant can insert their own testimonial', async () => {
    const { data, error } = await F.participant.client
      .from('testimonials')
      .insert({
        participant_id: F.participant.user.id,
        session_id: F.sessionId,
        content:
          '__rpc_test_ This is an integration-test testimonial that meets the fifty character minimum.',
        rating: 5,
      })
      .select('id')
      .single()
    expect(error, error?.message).toBeNull()
    expect(data?.id).toBeTruthy()
    testimonialId = data!.id
  })

  itTest('participant cannot insert as another participant_id (with-check fails)', async () => {
    const { error } = await F.participant.client.from('testimonials').insert({
      participant_id: F.facilitator.user.id,
      session_id: F.sessionId,
      content: '__rpc_test_ impersonation attempt content above fifty chars please.',
      rating: 5,
    })
    expect(error).not.toBeNull()
  })

  itTest('facilitator cannot insert a testimonial (role check fails)', async () => {
    const { error } = await F.facilitator.client.from('testimonials').insert({
      participant_id: F.facilitator.user.id,
      session_id: F.sessionId,
      content: '__rpc_test_ facilitator attempt to leave a testimonial above fifty chars.',
      rating: 4,
    })
    expect(error).not.toBeNull()
  })
})

describe('testimonials/select', () => {
  itTest('participant sees their own row', async () => {
    const { data, error } = await F.participant.client
      .from('testimonials')
      .select('id, participant_id')
      .eq('participant_id', F.participant.user.id)
    expect(error, error?.message).toBeNull()
    expect(data?.length).toBeGreaterThan(0)
  })

  itTest('facilitator of the session sees the testimonial', async () => {
    const { data, error } = await F.facilitator.client
      .from('testimonials')
      .select('id, session_id')
      .eq('session_id', F.sessionId)
    expect(error, error?.message).toBeNull()
    expect(data?.length).toBeGreaterThan(0)
  })

  itTest('admin sees all testimonials', async () => {
    const { data, error } = await F.admin.client
      .from('testimonials')
      .select('id')
    expect(error, error?.message).toBeNull()
    expect(data?.length).toBeGreaterThan(0)
  })

  itTest('inactive user sees nothing', async () => {
    const { data, error } = await F.inactive.client
      .from('testimonials')
      .select('id')
    expect(error, error?.message).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })
})

describe('testimonials/update', () => {
  itTest('participant can update their own row', async () => {
    const newContent =
      '__rpc_test_ Updated content for integration test still long enough for the constraint.'
    const { error } = await F.participant.client
      .from('testimonials')
      .update({ content: newContent })
      .eq('participant_id', F.participant.user.id)
    expect(error, error?.message).toBeNull()
  })

  itTest('participant cannot delete their own row (no delete policy)', async () => {
    const { error } = await F.participant.client
      .from('testimonials')
      .delete()
      .eq('participant_id', F.participant.user.id)
    // RLS denies → either an error OR a no-op (0 rows affected).
    // We accept either outcome and re-check the row still exists.
    const { data } = await F.adminClient
      .from('testimonials')
      .select('id')
      .eq('participant_id', F.participant.user.id)
    expect(data?.length ?? 0).toBeGreaterThan(0)
    void error
  })
})

describe('testimonials/check-constraints', () => {
  itTest('content shorter than 50 chars is rejected by CHECK', async () => {
    const { error } = await F.participant.client.from('testimonials').upsert(
      {
        participant_id: F.participant.user.id,
        session_id: F.sessionId,
        content: 'too short',
        rating: 3,
      },
      { onConflict: 'participant_id,session_id' }
    )
    expect(error).not.toBeNull()
  })
})
