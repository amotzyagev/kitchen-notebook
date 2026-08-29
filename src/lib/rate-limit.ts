import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Named quota buckets. Each is counted separately per user, so exhausting one
 * does not affect the others — previously every call site shared a single
 * per-user counter while comparing it against its own limit, which meant
 * uploading cover images ate into the AI-parse allowance.
 */
export const RATE_LIMIT_BUCKETS = {
  aiParse: { bucket: 'ai_parse', limit: 10 },
  coverImage: { bucket: 'cover_image', limit: 10 },
  share: { bucket: 'share', limit: 20 },
} as const

export type RateLimitBucket = keyof typeof RATE_LIMIT_BUCKETS

export interface RateLimitResult {
  success: boolean
  remaining: number
  /** Seconds until the window resets; suitable for a Retry-After header. */
  retryAfterSeconds: number
}

/**
 * Consume one unit from a user's quota for the given bucket.
 *
 * Counters live in Postgres rather than process memory so that all serverless
 * instances share them. See migration 017.
 *
 * Fails OPEN: if the counter cannot be read the request is allowed and the
 * error is logged. A database that cannot serve this query cannot serve the
 * recipe save that follows either, so failing closed would turn a database
 * blip into a hard outage without protecting anything that is still reachable.
 */
export async function rateLimit(
  bucketName: RateLimitBucket,
  userId: string
): Promise<RateLimitResult> {
  const { bucket, limit } = RATE_LIMIT_BUCKETS[bucketName]

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_bucket: bucket,
      p_user_id: userId,
      p_limit: limit,
      p_window_seconds: 60,
    })

    if (error) throw error

    const row = Array.isArray(data) ? data[0] : data
    if (!row) throw new Error('consume_rate_limit returned no row')

    const resetAt = new Date(row.reset_at).getTime()
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))

    return {
      success: row.allowed,
      remaining: row.remaining,
      retryAfterSeconds,
    }
  } catch (err) {
    console.error('[rate-limit] Counter unavailable, allowing request:', err)
    return { success: true, remaining: limit, retryAfterSeconds: 60 }
  }
}
