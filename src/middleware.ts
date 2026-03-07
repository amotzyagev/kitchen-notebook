import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getUser() instead of getSession() for security
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users from protected routes to /login
  if (!user && pathname.startsWith('/(protected)')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Also handle the actual resolved paths under (protected) group
  const isProtectedRoute = pathname.startsWith('/recipes') || pathname.startsWith('/settings') || pathname.startsWith('/api/recipes')
  if (!user && isProtectedRoute) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'לא מאומת' }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Check approval status for authenticated users on protected routes
  if (user && isProtectedRoute) {
    const adminEmail = process.env.ADMIN_EMAIL
    const isAdmin = user.email?.toLowerCase() === adminEmail?.toLowerCase()

    if (!isAdmin) {
      // Check user_profiles for approval
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('approved')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // No profile yet (existing user before approval feature) — create one in background
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
        fetch(`${appUrl}/api/auth/on-signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '',
          },
          body: JSON.stringify({ userId: user.id, email: user.email }),
        }).catch(() => {})
        // Redirect to pending while profile is created
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'המשתמש ממתין לאישור' }, { status: 403 })
        }
        const url = request.nextUrl.clone()
        url.pathname = '/pending-approval'
        return NextResponse.redirect(url)
      }

      if (!profile.approved) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'המשתמש ממתין לאישור' }, { status: 403 })
        }
        const url = request.nextUrl.clone()
        url.pathname = '/pending-approval'
        return NextResponse.redirect(url)
      }
    }
  }

  // Admin page access — only admin can access
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    if (user.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
      const url = request.nextUrl.clone()
      url.pathname = '/recipes'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users from /login to /recipes
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/recipes'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
