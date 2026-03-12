import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rate-limit'
import { ERROR_RATE_LIMIT } from '@/lib/constants/error-messages'
import { VALID_IMAGE_TYPES, RECIPE_IMAGES_BUCKET } from '@/lib/constants/image'

export const maxDuration = 30
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. Verify auth
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

    // 2. Rate limit check
    const { success: withinLimit } = rateLimit(user.id, 10)
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'rate_limit', message: ERROR_RATE_LIMIT },
        { status: 429 }
      )
    }

    // 3. Fetch recipe and verify ownership
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json(
        { error: 'not_found', message: 'המתכון לא נמצא' },
        { status: 404 }
      )
    }

    if (recipe.user_id !== user.id) {
      return NextResponse.json(
        { error: 'forbidden', message: 'אין הרשאה לעדכן מתכון זה' },
        { status: 403 }
      )
    }

    // 4. Parse FormData
    const formData = await request.formData()
    const file = formData.get('file')

    // 5. Validate file
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'invalid_file', message: 'יש להעלות קובץ תמונה (JPEG, PNG או WebP)' },
        { status: 400 }
      )
    }

    if (!(VALID_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json(
        { error: 'invalid_file', message: 'יש להעלות קובץ תמונה (JPEG, PNG או WebP)' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'file_too_large', message: 'הקובץ גדול מדי. הגודל המרבי הוא 2MB' },
        { status: 413 }
      )
    }

    // 6. Upload to storage
    const path = `${user.id}/${id}/cover.webp`
    const { error: uploadError } = await supabase.storage
      .from(RECIPE_IMAGES_BUCKET)
      .upload(path, file, { upsert: true })

    if (uploadError) {
      console.error('[cover-image] Upload error:', uploadError)
      return NextResponse.json(
        { error: 'upload_failed', message: 'שגיאה בהעלאת התמונה' },
        { status: 500 }
      )
    }

    // 7. Update DB with admin client
    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient
      .from('recipes')
      .update({ cover_image_path: path })
      .eq('id', id)

    if (updateError) {
      console.error('[cover-image] DB update error:', updateError)
      return NextResponse.json(
        { error: 'update_failed', message: 'שגיאה בעדכון המתכון' },
        { status: 500 }
      )
    }

    // 8. Return success
    return NextResponse.json({ cover_image_path: path })
  } catch (error) {
    console.error('[cover-image] POST error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'שגיאה בהעלאת התמונה' },
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

    // 1. Verify auth
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const { supabase, user } = auth

    // 2. Fetch recipe and verify ownership
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, user_id, cover_image_path')
      .eq('id', id)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json(
        { error: 'not_found', message: 'המתכון לא נמצא' },
        { status: 404 }
      )
    }

    if (recipe.user_id !== user.id) {
      return NextResponse.json(
        { error: 'forbidden', message: 'אין הרשאה לעדכן מתכון זה' },
        { status: 403 }
      )
    }

    // 3. Check if cover image exists
    if (!recipe.cover_image_path) {
      return NextResponse.json(
        { error: 'not_found', message: 'המתכון לא נמצא' },
        { status: 404 }
      )
    }

    // 4. Delete from storage
    const { error: deleteError } = await supabase.storage
      .from(RECIPE_IMAGES_BUCKET)
      .remove([recipe.cover_image_path])

    if (deleteError) {
      console.error('[cover-image] Storage delete error:', deleteError)
      return NextResponse.json(
        { error: 'delete_failed', message: 'שגיאה במחיקת התמונה' },
        { status: 500 }
      )
    }

    // 5. Update DB
    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient
      .from('recipes')
      .update({ cover_image_path: null })
      .eq('id', id)

    if (updateError) {
      console.error('[cover-image] DB update error:', updateError)
      return NextResponse.json(
        { error: 'update_failed', message: 'שגיאה בעדכון המתכון' },
        { status: 500 }
      )
    }

    // 6. Return success
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[cover-image] DELETE error:', error)
    return NextResponse.json(
      { error: 'server_error', message: 'שגיאה במחיקת התמונה' },
      { status: 500 }
    )
  }
}
