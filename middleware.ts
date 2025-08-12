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
  // Retry authentication up to 2 times for reliability
  let user = null;
  let authError = null;
  let session = null;
  let sessionError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`🔐 Middleware auth attempt ${attempt}/2 for ${request.nextUrl.pathname}`);
      
      const authResult = await supabase.auth.getUser();
      user = authResult.data.user;
      authError = authResult.error;

      if (!authError && user) {
        // If we got a user, also get the session
        const sessionResult = await supabase.auth.getSession();
        session = sessionResult.data.session;
        sessionError = sessionResult.error;
        
        console.log(`✅ Auth successful on attempt ${attempt}`);
        break; // Success, exit retry loop
      } else {
        console.warn(`⚠️ Auth attempt ${attempt} failed:`, authError?.message || 'No user');
        if (attempt < 2) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error(`💥 Auth attempt ${attempt} error:`, error);
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Enhanced session validation with timeout checks
  // Use only authenticated user from getUser(), not session.user (security best practice)
  let isAuthenticated = !!(user && !authError && session && !sessionError);
  let logoutReason = '';
  let userRole: string | null = null;

  // Get user role if authenticated
  if (isAuthenticated && user) {
    try {
      // Prefer a direct SELECT to avoid issues with different RPC variants
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, role_id, roles:role_id(name)')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        userRole = (data as any)?.roles?.name || null;
      }

      if (!userRole) {
        // Fallback to RPC if direct select didn't resolve
        const { data: roleData } = await supabase.rpc('get_user_role');
        userRole = (roleData as any) || 'user';
      }
    } catch (error) {
      console.error('Error getting user role in middleware:', error);
      userRole = 'user';
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
    const allCookies = request.cookies.getAll();
    const lastActivityCookie = allCookies.find((c) => c.name === 'lastActivity');
    const sessionStartCookie = allCookies.find((c) => c.name === 'sessionStart');
    
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
      const response = NextResponse.next({ request });
      // Copy cookies from supabaseResponse to the intermediate response
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value);
      });
      const redirectResponse = NextResponse.redirect(url);
      // Preserve cookies on the redirect response as well
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value);
      });
      return redirectResponse;
    }
  }

  // Only redirect authenticated users away from auth pages AFTER login is complete
  // But allow them to stay on auth pages during the login process
  if (isAuthenticated && user && (request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname.startsWith('/login'))) {
    // Check if this is not a login form submission or confirmation process
    if (!request.nextUrl.pathname.includes('/confirm') && !request.nextUrl.searchParams.has('code')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      console.log('Redirecting authenticated user to dashboard:', user?.email)
      
      // Clear any error parameters when redirecting authenticated users
      const response = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value)
      })
      return response
    }
  }

  // Redirect unauthenticated users to login form with clean URL
  if (
    !isAuthenticated &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/login')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    
    // Always redirect to clean login page without error parameters
    console.log('Redirecting unauthenticated user to login')
    
    const response = NextResponse.redirect(url)
    // Preserve Supabase session cookies
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value)
    })
    // Clean up any session tracking cookies
    response.cookies.delete('lastActivity')
    response.cookies.delete('sessionStart')
    response.cookies.delete('sessionWarningShown')
    
    return response
  }

  // Handle invalid or expired sessions
  if (user && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    console.log('Session invalid, redirecting to login')
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value)
    })
    return response
  }

  // Ensure root auth path redirects to login
  if (!isAuthenticated && request.nextUrl.pathname === '/auth') {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value)
    })
    return response
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
