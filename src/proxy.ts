import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl
  const isProtectedAppRoute = pathname === '/dashboard' || pathname === '/account' || pathname === '/create-party'

  if (pathname.startsWith('/admin')) {
    // Keep this lightweight in proxy: only require an authenticated session.
    // Admin authorization happens server-side in admin layout/API routes.
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } else if (isProtectedAppRoute) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('blocked')
      .eq('id', session.user.id)
      .single()
    if (profile?.blocked) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?blocked=1', request.url))
    }
  } else if (pathname === '/login' || pathname === '/register') {
    // Auth-page redirects: read session from cookie (no network call)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.(?:json|webmanifest)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
