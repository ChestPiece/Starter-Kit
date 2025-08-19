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

  // IMPORTANT: Minimal code between client creation and auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isApiRoute = pathname.startsWith('/api')

  // Never redirect API routes; just refresh cookies/session silently
  if (isApiRoute) {
    return supabaseResponse
  }

  // Redirect unauthenticated users to the login page (allow auth routes and confirmation)
  if (
    !user &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/login')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      response.cookies.set(name, value, options)
    })
    return response
  }

  // Allow auth/confirm and reset-password pages and confirmation API route to always work
  if (
    pathname.startsWith('/auth/confirm') || 
    pathname.startsWith('/auth/reset-password') ||
    pathname.startsWith('/api/auth/confirm')
  ) {
    return supabaseResponse
  }

  // Redirect authenticated users away from auth pages, except for reset with code
  if (
    user &&
    (pathname.startsWith('/auth') || pathname.startsWith('/login'))
  ) {
    const searchParams = request.nextUrl.searchParams
    const isResetPassword = pathname.includes('/reset-password')
    const hasCode = searchParams.has('code')

    if (!isResetPassword || !hasCode) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      const response = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
        response.cookies.set(name, value, options)
      })
      return response
    }
  }

  // Ensure root auth path redirects to login for unauthenticated users
  if (!user && pathname === '/auth') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      response.cookies.set(name, value, options)
    })
    return response
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
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
