import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, resolveUserDisplayInfo } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rate-limit'
import { ERROR_RATE_LIMIT, ERROR_SERVER } from '@/lib/constants/error-messages'

const shareSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
})

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

    const { success: withinLimit } = rateLimit(user.id, 20)
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'rate_limit', message: ERROR_RATE_LIMIT },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = shareSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'כתובת אימייל לא תקינה' },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    // Look up recipient by email
    const admin = createAdminClient()
    const { data: targetProfile } = await admin
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single()

    // Silently succeed if user not found (privacy)
    if (!targetProfile) {
      return NextResponse.json({ success: true })
    }

    // Can't share with yourself
    if (targetProfile.id === user.id) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'לא ניתן לשתף עם עצמך' },
        { status: 400 }
      )
    }

    // Check for existing share (upsert logic)
    const { data: existing } = await admin
      .from('notebook_shares')
      .select('id, status, declined_at')
      .eq('owner_id', user.id)
      .eq('shared_with_user_id', targetProfile.id)
      .single()

    if (existing) {
      if (existing.status === 'declined') {
        // Check cooldown (1 day)
        if (existing.declined_at) {
          const cooldownEnd = new Date(existing.declined_at)
          cooldownEnd.setDate(cooldownEnd.getDate() + 1)
          if (new Date() < cooldownEnd) {
            return NextResponse.json(
              { error: 'cooldown', message: 'לא ניתן לשתף שוב כעת. נסו שוב מאוחר יותר.' },
              { status: 400 }
            )
          }
        }
        // Cooldown passed — reactivate
        const { error: updateError } = await admin
          .from('notebook_shares')
          .update({ status: 'pending', declined_at: null, updated_at: new Date().toISOString() })
          .eq('id', existing.id)

        if (updateError) {
          console.error('[notebook-shares] Update error:', updateError)
          return NextResponse.json(
            { error: 'share_failed', message: 'שגיאה בשיתוף' },
            { status: 500 }
          )
        }
        return NextResponse.json({ success: true })
      }

      // Already shared (pending, approved, or hidden)
      return NextResponse.json(
        { error: 'already_shared', message: 'המחברת כבר משותפת עם משתמש זה' },
        { status: 400 }
      )
    }

    // Create new share
    const { error: insertError } = await supabase
      .from('notebook_shares')
      .insert({
        owner_id: user.id,
        shared_with_user_id: targetProfile.id,
      })

    if (insertError) {
      console.error('[notebook-shares] Insert error:', insertError)
      return NextResponse.json(
        { error: 'share_failed', message: 'שגיאה בשיתוף' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[notebook-shares] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: ERROR_SERVER },
      { status: 500 }
    )
  }
}

// GET: List outgoing shares (owner view) — used by US6
export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

    const { data: shares, error } = await supabase
      .from('notebook_shares')
      .select('id, shared_with_user_id, status, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[notebook-shares] Fetch error:', error)
      return NextResponse.json(
        { error: 'fetch_failed', message: 'שגיאה בטעינה' },
        { status: 500 }
      )
    }

    // Resolve recipient emails
    const sharesWithEmail = await Promise.all(
      (shares ?? []).map(async (share) => {
        const info = await resolveUserDisplayInfo(share.shared_with_user_id)
        return {
          id: share.id,
          shared_with_email: info.email,
          status: share.status,
          created_at: share.created_at,
        }
      })
    )

    return NextResponse.json({ shares: sharesWithEmail })
  } catch (error) {
    console.error('[notebook-shares] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: ERROR_SERVER },
      { status: 500 }
    )
  }
}
