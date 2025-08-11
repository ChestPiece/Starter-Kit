import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Session timeout configuration for server-side validation
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const FORCE_LOGOUT_ON_START = false; // Set to false to prevent redirect loops

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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  // Additional session validation
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession()

  // Enhanced session validation with timeout checks
  // Use only authenticated user from getUser(), not session.user (security best practice)
  let isAuthenticated = !!(user && !authError && session && !sessionError);
  let logoutReason = '';
  let userRole: string | null = null;

  // Get user role if authenticated
  if (isAuthenticated && user) {
    try {
      // Get user role using the database function
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role');
      
      if (!roleError && roleData) {
        userRole = roleData;
      } else {
        userRole = 'user'; // Default role
      }
    } catch (error) {
      console.error('Error getting user role in middleware:', error);
      userRole = 'user'; // Default role
    }
  }

  // Skip force logout on start if already on auth pages to prevent loops
  if (FORCE_LOGOUT_ON_START && isAuthenticated && !request.nextUrl.pathname.startsWith('/auth')) {
    console.log('Force logout on start enabled, invalidating session');
    isAuthenticated = false;
    logoutReason = 'force_logout_on_start';
  }

  // Check session expiry based on Supabase session timestamp
  if (isAuthenticated && session?.expires_at) {
    const sessionExpiry = new Date(session.expires_at * 1000);
    const now = new Date();
    
    if (sessionExpiry <= now) {
      console.log('Supabase session expired');
      isAuthenticated = false;
      logoutReason = 'supabase_session_expired';
    }
  }

  // Check session duration and inactivity from cookies if available
  if (isAuthenticated) {
    const lastActivityCookie = request.cookies.get('lastActivity');
    const sessionStartCookie = request.cookies.get('sessionStart');
    
    if (sessionStartCookie) {
      const sessionStart = new Date(sessionStartCookie.value).getTime();
      const sessionDuration = Date.now() - sessionStart;
      
      if (sessionDuration > MAX_SESSION_DURATION) {
        console.log('Session exceeded maximum duration');
        isAuthenticated = false;
        logoutReason = 'max_duration_exceeded';
      }
    }
    
    if (lastActivityCookie && !logoutReason) {
      const lastActivity = new Date(lastActivityCookie.value).getTime();
      const inactiveTime = Date.now() - lastActivity;
      
      if (inactiveTime > SESSION_TIMEOUT) {
        console.log('Session expired due to inactivity');
        isAuthenticated = false;
        logoutReason = 'inactivity_timeout';
      }
    }
  }

  // Only log important auth events, not every request
  const isImportantPath = !request.nextUrl.pathname.includes('/_next/') && 
                         !request.nextUrl.pathname.includes('/manifest.json') &&
                         !request.nextUrl.pathname.includes('/favicon.ico');
  
  if (!isAuthenticated && isImportantPath) {
    console.log(`🔐 Auth required for: ${request.nextUrl.pathname}`);
  } else if (isAuthenticated && isImportantPath && userRole) {
    // Only log when role or path changes significantly
    const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
    const isMainPage = request.nextUrl.pathname === '/';
    const isProtectedPage = request.nextUrl.pathname.startsWith('/settings') || request.nextUrl.pathname.startsWith('/users');
    
    if (isMainPage || isProtectedPage || isAuthPage) {
      console.log(`✅ ${userRole.toUpperCase()} access to: ${request.nextUrl.pathname}`);
    }
  }

  // Role-based access control for authenticated users
  if (isAuthenticated && userRole) {
    const pathname = request.nextUrl.pathname;
    
    // Check if user has permission to access the requested route
    let hasAccess = true;
    let redirectTo = '/';

    // Apply role-based access rules
    if (pathname.startsWith('/settings')) {
      // Settings require manager or admin role
      if (userRole !== 'manager' && userRole !== 'admin') {
        hasAccess = false;
        redirectTo = '/'; // Redirect to dashboard
      }
    } else if (pathname.startsWith('/users')) {
      // Users page requires admin role only
      if (userRole !== 'admin') {
        hasAccess = false;
        redirectTo = userRole === 'manager' ? '/settings' : '/';
      }
    }

    // If user doesn't have access, redirect them
    if (!hasAccess) {
      console.log(`🚫 ACCESS DENIED: ${userRole.toUpperCase()} role cannot access ${pathname} → redirecting to ${redirectTo}`);
      const url = request.nextUrl.clone();
      url.pathname = redirectTo;
      url.searchParams.set('access_denied', 'true');
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (isAuthenticated && (request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname.startsWith('/login'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    console.log('Redirecting authenticated user to dashboard:', user?.email)
    
    // Clear any error parameters when redirecting authenticated users
    const response = NextResponse.redirect(url)
    return response
  }

  // Force redirect unauthenticated users to login form
  if (
    !isAuthenticated &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/login')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    
    // Only add error parameters when there's actually an error or logout reason
    // For normal access (no session), redirect to clean login page
    if (logoutReason) {
      url.searchParams.set('reason', logoutReason)
      console.log('Redirecting with logout reason:', logoutReason)
    } else if (authError && authError.message !== 'Auth session missing!') {
      // Only add session_expired for real authentication errors, not missing session
      url.searchParams.set('session_expired', 'true')
      console.log('Redirecting due to auth error:', authError.message)
    } else if (sessionError) {
      url.searchParams.set('session_error', 'true')
      console.log('Redirecting due to session error:', sessionError.message)
    } else {
      // Normal redirect for unauthenticated user - no parameters needed
      console.log('Normal redirect to login - no error parameters')
    }
    
    // Clear session tracking cookies only if there was an actual session
    const response = NextResponse.redirect(url)
    if (logoutReason || authError || sessionError) {
      response.cookies.delete('lastActivity')
      response.cookies.delete('sessionStart')
      response.cookies.delete('sessionWarningShown')
    }
    
    return response
  }

  // Handle invalid or expired sessions
  if (user && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('session_invalid', 'true')
    console.log('Session invalid, redirecting to login')
    return NextResponse.redirect(url)
  }

  // Ensure root auth path redirects to login
  if (!isAuthenticated && request.nextUrl.pathname === '/auth') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css)$).*)",
  ],
};
