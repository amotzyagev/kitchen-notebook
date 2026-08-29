import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc }),
}))

const { rateLimit, RATE_LIMIT_BUCKETS } = await import('@/lib/rate-limit')

function inSeconds(n: number) {
  return new Date(Date.now() + n * 1000).toISOString()
}

describe('RATE_LIMIT_BUCKETS', () => {
  it('gives every bucket a distinct counter name', () => {
    const names = Object.values(RATE_LIMIT_BUCKETS).map((b) => b.bucket)
    expect(new Set(names).size).toBe(names.length)
  })

  it('keeps the limits the routes previously used', () => {
    expect(RATE_LIMIT_BUCKETS.aiParse.limit).toBe(10)
    expect(RATE_LIMIT_BUCKETS.coverImage.limit).toBe(10)
    expect(RATE_LIMIT_BUCKETS.share.limit).toBe(20)
  })
})

describe('rateLimit', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('passes the bucket name and its limit through to the counter', async () => {
    rpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 9, reset_at: inSeconds(60) }],
      error: null,
    })

    await rateLimit('coverImage', 'user-1')

    expect(rpc).toHaveBeenCalledWith('consume_rate_limit', {
      p_bucket: 'cover_image',
      p_user_id: 'user-1',
      p_limit: 10,
      p_window_seconds: 60,
    })
  })

  // The bug this replaces: one counter per user, compared against whichever
  // limit the calling route happened to pass.
  it('uses a separate counter per bucket', async () => {
    rpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 1, reset_at: inSeconds(60) }],
      error: null,
    })

    await rateLimit('aiParse', 'user-1')
    await rateLimit('share', 'user-1')

    expect(rpc.mock.calls[0][1].p_bucket).toBe('ai_parse')
    expect(rpc.mock.calls[1][1].p_bucket).toBe('share')
    expect(rpc.mock.calls[0][1].p_bucket).not.toBe(rpc.mock.calls[1][1].p_bucket)
  })

  it('allows a request the counter accepts', async () => {
    rpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 4, reset_at: inSeconds(30) }],
      error: null,
    })

    const result = await rateLimit('aiParse', 'user-1')

    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('blocks a request the counter rejects and reports when to retry', async () => {
    rpc.mockResolvedValue({
      data: [{ allowed: false, remaining: 0, reset_at: inSeconds(42) }],
      error: null,
    })

    const result = await rateLimit('aiParse', 'user-1')

    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSeconds).toBeGreaterThan(38)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(43)
  })

  it('never reports a retry-after below one second', async () => {
    rpc.mockResolvedValue({
      data: [{ allowed: false, remaining: 0, reset_at: inSeconds(-30) }],
      error: null,
    })

    const result = await rateLimit('aiParse', 'user-1')

    expect(result.retryAfterSeconds).toBe(1)
  })

  // A database that cannot serve this query cannot serve the recipe save that
  // follows, so failing closed would turn a blip into an outage.
  it('fails open when the counter errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'connection refused' } })

    const result = await rateLimit('aiParse', 'user-1')

    expect(result.success).toBe(true)
  })

  it('fails open when the rpc call throws', async () => {
    rpc.mockRejectedValue(new Error('network down'))

    const result = await rateLimit('share', 'user-1')

    expect(result.success).toBe(true)
  })

  it('fails open when the counter returns no row', async () => {
    rpc.mockResolvedValue({ data: [], error: null })

    const result = await rateLimit('aiParse', 'user-1')

    expect(result.success).toBe(true)
  })
})
