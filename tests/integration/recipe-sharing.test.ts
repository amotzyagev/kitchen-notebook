import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), limit: vi.fn(), ownership: vi.fn(), recipient: vi.fn(), upsert: vi.fn(),
}))
vi.mock('@/lib/api-utils', () => ({ requireAuth: mocks.auth }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: mocks.limit }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ single: mocks.recipient }) }) }) }),
}))
import { POST } from '@/app/api/recipes/share/route'

const recipeId = '11111111-1111-4111-8111-111111111111'
function request(recipeIds: unknown = [recipeId]) {
  return new Request('http://localhost/api/recipes/share', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipeIds, email: 'friend@example.com' }),
  })
}

describe('recipe sharing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'owner' }, supabase: {
      from: () => ({
        select: () => ({ in: () => ({ eq: mocks.ownership }) }),
        upsert: mocks.upsert,
      }),
    } })
    mocks.limit.mockResolvedValue({ success: true })
    mocks.ownership.mockResolvedValue({ data: [{ id: recipeId }], error: null })
    mocks.recipient.mockResolvedValue({ data: { id: 'recipient' }, error: null })
    mocks.upsert.mockResolvedValue({ error: null })
  })

  it('rejects malformed recipe IDs before querying', async () => {
    expect((await POST(request('not-an-array'))).status).toBe(400)
    expect(mocks.ownership).not.toHaveBeenCalled()
  })

  it('rejects recipes the caller does not own before looking up recipients', async () => {
    mocks.ownership.mockResolvedValue({ data: [], error: null })
    expect((await POST(request())).status).toBe(403)
    expect(mocks.recipient).not.toHaveBeenCalled()
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('does not report database failures as a successful share', async () => {
    mocks.ownership.mockResolvedValue({ data: null, error: { message: 'offline' } })
    expect((await POST(request())).status).toBe(500)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('preserves the neutral response for an unavailable recipient', async () => {
    mocks.recipient.mockResolvedValue({ data: null })
    expect(await (await POST(request())).json()).toEqual({ success: true, shared: 0 })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('deduplicates IDs and reports the actual shared count', async () => {
    expect(await (await POST(request([recipeId, recipeId]))).json()).toEqual({ success: true, shared: 1 })
    expect(mocks.upsert.mock.calls[0][0]).toHaveLength(1)
  })
})
