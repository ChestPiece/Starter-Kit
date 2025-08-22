import { logger } from '@/lib/services/logger';

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Role-based access mapping
const ROLE_ACCESS_MAP: Record<string, string[]> = {
  admin: ['/', '/settings', '/users'],
  manager: ['/', '/settings'], 
  user: ['/']
};

function hasRouteAccess(role: string | undefined, route: string): boolean {
  if (!role) return false;
  
  const allowedRoutes = ROLE_ACCESS_MAP[role] || [];
  
  // Check exact match first
  if (allowedRoutes.includes(route)) {
    return true;
  }
  
  // Check if route starts with any allowed route (for sub-routes)
  return allowedRoutes.some(allowedRoute => {
    if (allowedRoute === '/') {
      return route === '/';
    }
    return route.startsWith(allowedRoute);
  });
}

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

  // Allow authenticated users to access auth pages - no automatic redirects
  // Users should only enter the app when they explicitly choose to

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

  // Role-based access control for authenticated users
  if (user && !pathname.startsWith('/auth') && !pathname.startsWith('/login')) {
    try {
      // Get user's role from the database
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('roles:role_id!inner(name)')
        .eq('id', user.id)
        .single();

      const userRole = (userProfile?.roles as any)?.name;

      // Check if user has access to the requested route
      if (!hasRouteAccess(userRole, pathname)) {
        logger.info(`Access denied for role ${userRole} to ${pathname}`);
        
        // Redirect to dashboard (fallback route)
        const url = request.nextUrl.clone()
        url.pathname = '/'
        const response = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
          response.cookies.set(name, value, options)
        })
        return response
      }
    } catch (error) {
      logger.error('Role access check failed:', { error: error instanceof Error ? error.message : String(error) });
      // On error, allow access but log the issue
      // This prevents breaking the app if there's a database issue
    }
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
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
