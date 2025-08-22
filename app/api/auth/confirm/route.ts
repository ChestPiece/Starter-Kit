import { logger } from '@/lib/services/logger';

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimiter, rateLimitConfigs, getClientIP } from '@/lib/utils/rate-limiter'
import { auditLogger, extractAuditContext } from '@/lib/services/audit-logger'

export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);
  const auditContext = extractAuditContext(request);
  
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type')
    const error = searchParams.get('error')
    const errorCode = searchParams.get('error_code')
    const errorDescription = searchParams.get('error_description')
    
    logger.info('Confirmation attempt:', { 
      hasCode: !!code, 
      hasTokenHash: !!token_hash, 
      type, 
      error,
      errorCode,
      origin,
      fullUrl: request.url 
    })

    // Handle explicit error parameters from Supabase (e.g., expired links)
    if (error || errorCode) {
      logger.info('Confirmation error detected:', { error, errorCode, errorDescription })
      
      // Log the failed confirmation attempt
      await auditLogger.logAuthOperation(
        'Email confirmation failed - URL contains error parameters',
        auditContext,
        { error, errorCode, errorDescription },
        false,
        errorDescription || error || undefined
      );
      
      // Handle specific error codes
      if (errorCode === 'otp_expired' || error === 'access_denied') {
        return NextResponse.redirect(`${origin}/auth/login?message=link_expired`)
      }
      
      if (errorCode === 'invalid_otp' || error === 'invalid_request') {
        return NextResponse.redirect(`${origin}/auth/login?message=invalid_confirmation_link`)
      }
      
      // Generic error handling
      return NextResponse.redirect(`${origin}/auth/login?message=confirmation_failed`)
    }

    // Prepare a response object that will be mutated by Supabase cookie setter
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
            // Ensure cookies are attached to the final response
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    if (code) {
      // Verify email confirmation WITHOUT creating/maintaining a session
      // We'll exchange the code but then immediately sign out to avoid auto-login
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        logger.error('Email confirmation failed:', error)
        
        // Check rate limit for failed auth attempts
        const rateLimitInfo = rateLimiter.getRateLimitInfo(clientIP, rateLimitConfigs.authFailures);
        if (rateLimitInfo.isLimited) {
          await auditLogger.logAuthOperation(
            'Email confirmation failed - Rate limited',
            auditContext,
            { code: code ? '[PRESENT]' : null, reason: 'rate_limited' },
            false,
            'Too many failed authentication attempts'
          );
          return NextResponse.redirect(`${origin}/auth/login?message=rate_limited`);
        }

        // Log failed authentication attempt
        await auditLogger.logAuthOperation(
          'Email confirmation failed',
          auditContext,
          { code: code ? '[PRESENT]' : null, error: error.message },
          false,
          error.message
        );

        return NextResponse.redirect(`${origin}/auth/login?message=confirmation_failed`)
      }

      // Email confirmed successfully - now sign out to prevent auto-login
      await supabase.auth.signOut()
      
      logger.info('✅ Email confirmed successfully for:', { email: data?.user?.email, status: 'user signed out' })
      
      // Log successful email confirmation (but user not logged in)
      await auditLogger.logAuthOperation(
        'Email confirmation successful - user signed out',
        { ...auditContext, userId: data?.user?.id, userEmail: data?.user?.email },
        { code: '[PRESENT]', userEmail: data?.user?.email },
        true
      );

      // Redirect to login with success message (no session cookies)
      return NextResponse.redirect(`${origin}/auth/login?message=email_confirmed`)
    }

    // Handle token-based confirmation (fallback)
    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      })

      if (error) {
        logger.error('Token verification failed:', error)
        
        // Check rate limit for invalid token attempts
        const rateLimitInfo = rateLimiter.getRateLimitInfo(clientIP, rateLimitConfigs.invalidTokens);
        if (rateLimitInfo.isLimited) {
          await auditLogger.logAuthOperation(
            'Token verification failed - Rate limited',
            auditContext,
            { token_hash: '[PRESENT]', type, reason: 'rate_limited' },
            false,
            'Too many invalid token attempts'
          );
          return NextResponse.redirect(`${origin}/auth/login?message=rate_limited`);
        }

        // Log failed token verification
        await auditLogger.logAuthOperation(
          'Token verification failed',
          auditContext,
          { token_hash: '[PRESENT]', type, error: error.message },
          false,
          error.message
        );

        return NextResponse.redirect(`${origin}/auth/login?message=invalid_confirmation_link`)
      }

      // Token verified successfully - sign out to prevent auto-login
      await supabase.auth.signOut()
      
      logger.info('✅ Token verified successfully (user signed out)')
      
      // Log successful token verification
      await auditLogger.logAuthOperation(
        'Token verification successful - user signed out',
        auditContext,
        { token_hash: '[PRESENT]', type },
        true
      );

      // Redirect to login with success message (no session cookies)
      return NextResponse.redirect(`${origin}/auth/login?message=email_confirmed`)
    }

    // No valid confirmation parameters
    logger.info('No confirmation parameters found, redirecting to login with invalid_link message');
    return NextResponse.redirect(`${origin}/auth/login?message=invalid_link`)

  } catch (error: any) {
    logger.error('Confirmation error:', error)
    const { origin } = new URL(request.url)
    return NextResponse.redirect(`${origin}/auth/login?message=confirmation_failed`)
  }
}

// POST endpoint removed - email confirmation no longer creates sessions
// Users must log in manually after email verification
