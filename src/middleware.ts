import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Always use getUser() not getSession() — validates JWT server-side
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isAdminRoute = pathname.startsWith('/admin')
  const isControlRoute = pathname.startsWith('/control')
  const isTrainerRoute = pathname.startsWith('/trainer')
  const isDashboardRoute = isAdminRoute || isTrainerRoute
  const isProtectedRoute = isDashboardRoute || isControlRoute
  const isLoginRoute = pathname === '/login'

  // --- Not authenticated on protected route → login ---
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // --- Authenticated on protected route → enforce role ---
  if (user && isProtectedRoute) {
    const role = (user.app_metadata?.role as string) || 'client'

    if (isDashboardRoute && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/control'
      return NextResponse.redirect(url)
    }

    if (isControlRoute && role !== 'client') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }
  }

  // --- Authenticated on login page → redirect to correct dashboard ---
  if (user && isLoginRoute) {
    const role = (user.app_metadata?.role as string) || 'client'
    const url = request.nextUrl.clone()
    url.pathname = role === 'admin' ? '/admin' : '/control'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/control/:path*',
    '/trainer/:path*',
    '/login',
  ],
}
