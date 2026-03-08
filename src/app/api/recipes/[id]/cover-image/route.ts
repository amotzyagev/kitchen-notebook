import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'

export const maxDuration = 30

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. Verify auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'יש להתחבר כדי להשתמש בתכונה זו' },
        { status: 401 }
      )
    }

    // 2. Rate limit check
    const { success: withinLimit } = rateLimit(user.id, 10)
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'rate_limit', message: 'יותר מדי בקשות. נסה שוב בעוד דקה.' },
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

    if (!ALLOWED_TYPES.includes(file.type)) {
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
      .from('recipe-images')
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'יש להתחבר כדי להשתמש בתכונה זו' },
        { status: 401 }
      )
    }

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
      .from('recipe-images')
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
