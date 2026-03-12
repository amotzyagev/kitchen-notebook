import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/api-utils'
import { ERROR_SERVER } from '@/lib/constants/error-messages'

const actionSchema = z.object({
  action: z.enum(['approve', 'decline', 'hide', 'unhide']),
})

const validTransitions: Record<string, string[]> = {
  approve: ['pending'],
  decline: ['pending'],
  hide: ['approved'],
  unhide: ['hidden'],
}

const actionToStatus: Record<string, string> = {
  approve: 'approved',
  decline: 'declined',
  hide: 'hidden',
  unhide: 'approved',
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

    // Fetch the share — RLS ensures only owner or recipient can see it
    const { data: share, error: fetchError } = await supabase
      .from('notebook_shares')
      .select('id, owner_id, shared_with_user_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !share) {
      return NextResponse.json(
        { error: 'not_found', message: 'שיתוף לא נמצא' },
        { status: 404 }
      )
    }

    // Only recipient can update status
    if (share.shared_with_user_id !== user.id) {
      return NextResponse.json(
        { error: 'forbidden', message: 'אין הרשאה' },
        { status: 403 }
      )
    }

    // Validate state transition
    const allowedFrom = validTransitions[action]
    if (!allowedFrom.includes(share.status)) {
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
      .from('notebook_shares')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('[notebook-shares/[id]] Update error:', updateError)
      return NextResponse.json(
        { error: 'update_failed', message: 'שגיאה בעדכון' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error('[notebook-shares/[id]] Error:', error)
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

    // Fetch the share — RLS ensures only owner or recipient can see it
    const { data: share, error: fetchError } = await supabase
      .from('notebook_shares')
      .select('id, owner_id, shared_with_user_id')
      .eq('id', id)
      .single()

    if (fetchError || !share) {
      return NextResponse.json(
        { error: 'not_found', message: 'שיתוף לא נמצא' },
        { status: 404 }
      )
    }

    // Only owner or recipient can delete
    if (share.owner_id !== user.id && share.shared_with_user_id !== user.id) {
      return NextResponse.json(
        { error: 'forbidden', message: 'אין הרשאה' },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase
      .from('notebook_shares')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[notebook-shares/[id]] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'delete_failed', message: 'שגיאה במחיקה' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[notebook-shares/[id]] Error:', error)
    return NextResponse.json(
      { error: 'server_error', message: ERROR_SERVER },
      { status: 500 }
    )
  }
}
