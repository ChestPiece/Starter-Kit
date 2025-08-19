import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimiter, rateLimitConfigs, getClientIP } from '@/lib/utils/rate-limiter'
import { errorLogger } from '@/lib/services/error-logger'

export async function POST(request: NextRequest) {
  try {
    // Check rate limiting for auth endpoints (strict for resend)
    const clientIP = getClientIP(request);
    if (rateLimiter.isRateLimited(clientIP, rateLimitConfigs.auth)) {
      return NextResponse.json(
        { error: rateLimitConfigs.auth.message },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}))
    const { email } = body || {}

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Resend the confirmation email using Supabase
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/confirm`
      }
    })

    if (error) {
      console.error('Resend confirmation error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to resend confirmation email' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Confirmation email sent successfully' 
    })

  } catch (error: any) {
    errorLogger.error(error, { 
      context: 'Resend Confirmation',
      clientIP: getClientIP(request),
    });
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}






