import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Called after signup to create user profile and notify admin
export async function POST(request: Request) {
  try {
    // Verify internal secret to prevent unauthorized calls
    const secret = request.headers.get('X-Internal-Secret')
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, email } = await request.json()
    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 })
    }

    const adminEmail = process.env.ADMIN_EMAIL
    const supabase = createAdminClient()

    // Auto-approve if admin
    const isAdmin = email?.toLowerCase() === adminEmail?.toLowerCase()

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        email,
        approved: isAdmin,
      })

    if (profileError) {
      console.error('[on-signup] Profile creation error:', profileError)
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    // Notify admin (skip if the new user IS the admin)
    if (!isAdmin && adminEmail && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kitchen-notebook.vercel.app'

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Kitchen Notebook <onboarding@resend.dev>',
          to: adminEmail,
          subject: `משתמש חדש ממתין לאישור: ${email}`,
          html: `
            <div dir="rtl" style="font-family: sans-serif;">
              <h2>משתמש חדש נרשם</h2>
              <p><strong>אימייל:</strong> ${escapeHtml(email)}</p>
              <p><a href="${escapeHtml(appUrl)}/admin/users">לחץ כאן לאישור או דחייה</a></p>
            </div>
          `,
        })
        console.log('[on-signup] Admin notification sent for:', email)
      } catch (emailError) {
        // Don't fail the signup if email fails
        console.error('[on-signup] Failed to send admin notification:', emailError)
      }
    }

    console.log('[on-signup] Profile created for:', email, 'approved:', isAdmin)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[on-signup] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
