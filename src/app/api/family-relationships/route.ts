import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, resolveUserDisplayInfo } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rate-limit'
import { ERROR_RATE_LIMIT, ERROR_SERVER } from '@/lib/constants/error-messages'

const inviteSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
})

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { success: withinLimit } = rateLimit(user.id, 20)
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'rate_limit', message: ERROR_RATE_LIMIT },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'כתובת אימייל לא תקינה' },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    // Look up addressee by email
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

    // Can't invite yourself
    if (targetProfile.id === user.id) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'לא ניתן לשלוח בקשה לעצמך' },
        { status: 400 }
      )
    }

    // Check for existing row in BOTH directions (symmetric relationship)
    const { data: existingAsRequester } = await admin
      .from('family_relationships')
      .select('id, status, declined_at')
      .eq('requester_id', user.id)
      .eq('addressee_id', targetProfile.id)
      .single()

    const { data: existingAsAddressee } = await admin
      .from('family_relationships')
      .select('id, status, declined_at')
      .eq('requester_id', targetProfile.id)
      .eq('addressee_id', user.id)
      .single()

    // The other party already invited us — auto-accept their invite
    if (existingAsAddressee) {
      if (existingAsAddressee.status === 'pending') {
        const { error: acceptError } = await admin
          .from('family_relationships')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', existingAsAddressee.id)

        if (acceptError) {
          console.error('[family-relationships] Auto-accept error:', acceptError)
          return NextResponse.json(
            { error: 'invite_failed', message: 'שגיאה בשליחת הבקשה' },
            { status: 500 }
          )
        }
        return NextResponse.json({ success: true })
      }

      if (existingAsAddressee.status === 'accepted') {
        return NextResponse.json(
          { error: 'already_family', message: 'כבר חברי משפחה' },
          { status: 400 }
        )
      }
    }

    // We already sent a request previously
    if (existingAsRequester) {
      if (existingAsRequester.status === 'declined') {
        // Check 1-day cooldown
        if (existingAsRequester.declined_at) {
          const cooldownEnd = new Date(existingAsRequester.declined_at)
          cooldownEnd.setDate(cooldownEnd.getDate() + 1)
          if (new Date() < cooldownEnd) {
            return NextResponse.json(
              { error: 'cooldown', message: 'לא ניתן לשלוח בקשה שוב כעת. נסו שוב מאוחר יותר.' },
              { status: 400 }
            )
          }
        }
        // Cooldown passed — reactivate
        const { error: updateError } = await admin
          .from('family_relationships')
          .update({ status: 'pending', declined_at: null, updated_at: new Date().toISOString() })
          .eq('id', existingAsRequester.id)

        if (updateError) {
          console.error('[family-relationships] Reactivate error:', updateError)
          return NextResponse.json(
            { error: 'invite_failed', message: 'שגיאה בשליחת הבקשה' },
            { status: 500 }
          )
        }
        return NextResponse.json({ success: true })
      }

      // Already pending or accepted
      return NextResponse.json(
        { error: 'already_sent', message: 'בקשת משפחה כבר נשלחה למשתמש זה' },
        { status: 400 }
      )
    }

    // Create new family request
    const { error: insertError } = await admin
      .from('family_relationships')
      .insert({
        requester_id: user.id,
        addressee_id: targetProfile.id,
      })

    if (insertError) {
      console.error('[family-relationships] Insert error:', insertError)
      return NextResponse.json(
        { error: 'invite_failed', message: 'שגיאה בשליחת הבקשה' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[family-relationships] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: ERROR_SERVER },
      { status: 500 }
    )
  }
}

// GET: List outgoing family requests (requester view)
export async function GET() {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

    const { data: relationships, error } = await supabase
      .from('family_relationships')
      .select('id, addressee_id, status, created_at')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[family-relationships] Fetch error:', error)
      return NextResponse.json(
        { error: 'fetch_failed', message: 'שגיאה בטעינה' },
        { status: 500 }
      )
    }

    const relationshipsWithInfo = await Promise.all(
      (relationships ?? []).map(async (rel) => {
        const info = await resolveUserDisplayInfo(rel.addressee_id)
        return {
          id: rel.id,
          addressee_email: info.email,
          addressee_name: info.name,
          status: rel.status,
          created_at: rel.created_at,
        }
      })
    )

    return NextResponse.json({ relationships: relationshipsWithInfo })
  } catch (error) {
    console.error('[family-relationships] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: ERROR_SERVER },
      { status: 500 }
    )
  }
}
