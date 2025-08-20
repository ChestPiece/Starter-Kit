import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimiter, rateLimitConfigs, getClientIP } from '@/lib/utils/rate-limiter'
import { errorLogger } from '@/lib/services/error-logger'
import { createValidationError, createRateLimitError, createServerError, getRequestId } from '@/lib/utils/error-responses'

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const context = { 
    requestId, 
    endpoint: '/api/auth/resend-confirmation', 
    method: 'POST' 
  };

  try {
    // Check rate limiting for auth endpoints (strict for resend)
    const clientIP = getClientIP(request);
    const rateLimitInfo = rateLimiter.getRateLimitInfo(clientIP, rateLimitConfigs.auth);
    
    if (rateLimitInfo.isLimited) {
      const { response } = createRateLimitError(
        'AUTH_RATE_LIMITED',
        rateLimitInfo.message,
        rateLimitInfo.retryAfter || 900,
        rateLimitInfo.remaining,
        context
      );
      
      // Add additional headers
      response.headers.set('Retry-After', rateLimitInfo.retryAfter?.toString() || '900');
      response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitInfo.resetTime?.toString() || '');
      
      return response;
    }

    const body = await request.json().catch(() => ({}))
    const { email } = body || {}

    if (!email) {
      const { response } = createValidationError(
        'VALIDATION_MISSING_FIELD',
        'Email is required for resending confirmation',
        context,
        { field: 'email', received: typeof email }
      );
      return response;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      const { response } = createValidationError(
        'VALIDATION_INVALID_EMAIL',
        'Please provide a valid email address',
        context,
        { 
          email: email.substring(0, 20) + (email.length > 20 ? '...' : ''),
          format: 'Expected format: user@domain.com'
        }
      );
      return response;
    }

    const supabase = await createClient()

    // Get the origin from the request
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    
    // Resend the confirmation email using Supabase
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${origin}/api/auth/confirm`
      }
    })

    if (error) {
      console.error('Resend confirmation error:', error)
      
      // Check for specific Supabase error codes and messages
      if (error.message?.includes('email not confirmed')) {
        const { response } = createValidationError(
          'VALIDATION_EMAIL_ALREADY_CONFIRMED',
          'This email address is already confirmed',
          context,
          { email: email.substring(0, 20) + '...' }
        );
        return response;
      }
      
      // Handle Supabase's native rate limiting (code: over_email_send_rate_limit)
      if (error.code === 'over_email_send_rate_limit' || 
          error.message?.includes('rate limit') || 
          error.message?.includes('security purposes')) {
        
        // Extract wait time from error message if available (e.g., "after 9 seconds")
        const waitTimeMatch = error.message?.match(/after (\d+) seconds/);
        const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1]) : 60;
        
        const { response } = createRateLimitError(
          'AUTH_RATE_LIMITED',
          `Too many confirmation emails sent recently. Please wait ${waitTime} seconds before trying again.`,
          waitTime,
          0,
          context
        );
        return response;
      }
      
      // Handle user not found or invalid email
      if (error.message?.includes('User not found') || error.message?.includes('Invalid email')) {
        const { response } = createValidationError(
          'VALIDATION_EMAIL_NOT_FOUND',
          'No account found with this email address',
          context,
          { email: email.substring(0, 20) + '...' }
        );
        return response;
      }

      const { response } = createServerError(
        'AUTH_RESEND_FAILED',
        error.message || 'Failed to resend confirmation email',
        context,
        { supabaseError: error.message, supabaseCode: error.code }
      );
      return response;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Confirmation email sent successfully',
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId })
    })

  } catch (error: any) {
    errorLogger.error(error, { 
      context: 'Resend Confirmation',
      clientIP: getClientIP(request),
      requestId
    });
    
    const { response } = createServerError(
      'SERVER_ERROR',
      'An unexpected error occurred while processing your request',
      context,
      { originalError: error?.message }
    );
    return response;
  }
}






