import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api-utils'
import { ERROR_SERVER } from '@/lib/constants/error-messages'

const actionSchema = z.object({
  action: z.enum(['accept', 'decline']),
})

const validTransitions: Record<string, string[]> = {
  accept: ['pending'],
  decline: ['pending'],
}

const actionToStatus: Record<string, string> = {
  accept: 'accepted',
  decline: 'declined',
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

    const body = await request.json()
    const parsed = actionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'פעולה לא תקינה' },
        { status: 400 }
      )
    }

    const { action } = parsed.data

    // Fetch the relationship — RLS ensures only requester or addressee can see it
    const { data: rel, error: fetchError } = await supabase
      .from('family_relationships')
      .select('id, requester_id, addressee_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !rel) {
      return NextResponse.json(
        { error: 'not_found', message: 'בקשה לא נמצאה' },
        { status: 404 }
      )
    }

    // Only the addressee can accept/decline
    if (rel.addressee_id !== user.id) {
      return NextResponse.json(
        { error: 'forbidden', message: 'אין הרשאה' },
        { status: 403 }
      )
    }

    // Validate state transition
    const allowedFrom = validTransitions[action]
    if (!allowedFrom.includes(rel.status)) {
      return NextResponse.json(
        { error: 'invalid_transition', message: 'פעולה לא תקינה למצב הנוכחי' },
        { status: 400 }
      )
    }

    const newStatus = actionToStatus[action]
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (action === 'decline') {
      updateData.declined_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('family_relationships')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('[family-relationships/[id]] Update error:', updateError)
      return NextResponse.json(
        { error: 'update_failed', message: 'שגיאה בעדכון' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error('[family-relationships/[id]] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: ERROR_SERVER },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

    // Fetch the relationship — RLS ensures only requester or addressee can see it
    const { data: rel, error: fetchError } = await supabase
      .from('family_relationships')
      .select('id, requester_id, addressee_id')
      .eq('id', id)
      .single()

    if (fetchError || !rel) {
      return NextResponse.json(
        { error: 'not_found', message: 'בקשה לא נמצאה' },
        { status: 404 }
      )
    }

    // Either party can remove
    if (rel.requester_id !== user.id && rel.addressee_id !== user.id) {
      return NextResponse.json(
        { error: 'forbidden', message: 'אין הרשאה' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase
      .from('family_relationships')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[family-relationships/[id]] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'delete_failed', message: 'שגיאה במחיקה' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[family-relationships/[id]] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: ERROR_SERVER },
      { status: 500 }
    )
  }
}
