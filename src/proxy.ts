import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { logDevIncomingRequest, logDevProxyRedirect } from '@/lib/dev-server-log'

export async function proxy(request: NextRequest) {
  logDevIncomingRequest(request)

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
    // Validate JWT with Supabase Auth (not just cookies). Admin role is checked in layout/API.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const target = '/login'
      logDevProxyRedirect(request, target)
      return NextResponse.redirect(new URL(target, request.url))
    }
  } else if (isProtectedAppRoute) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      logDevProxyRedirect(request, '/')
      return NextResponse.redirect(new URL('/', request.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('blocked')
      .eq('id', user.id)
      .single()
    if (profile?.blocked) {
      await supabase.auth.signOut()
      const target = '/login?blocked=1'
      logDevProxyRedirect(request, target)
      return NextResponse.redirect(new URL(target, request.url))
    }
  } else if (pathname === '/login' || pathname === '/register') {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      logDevProxyRedirect(request, '/dashboard')
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
