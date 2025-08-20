import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, rateLimitConfigs, getClientIP } from '@/lib/utils/rate-limiter';
import { errorLogger } from '@/lib/services/error-logger';

export async function POST(request: NextRequest) {
  try {
    // Check rate limiting
    const clientIP = getClientIP(request);
    const rateLimitInfo = rateLimiter.getRateLimitInfo(clientIP, rateLimitConfigs.api);
    
    if (rateLimitInfo.isLimited) {
      return NextResponse.json(
        { 
          error: rateLimitInfo.message,
          retryAfter: rateLimitInfo.retryAfter,
          remaining: rateLimitInfo.remaining
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitInfo.retryAfter?.toString() || '900',
            'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
            'X-RateLimit-Reset': rateLimitInfo.resetTime?.toString() || ''
          }
        }
      );
    }

    const logData = await request.json();

    // Basic validation
    if (!logData.message || !logData.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Always log client errors (consistent behavior across environments)
    console.log('Client Error Log:', logData);
    
    // Always try to send to external logging service if configured
    // This works in both development and production
    try {
      // Example integrations:
      // - Send to Sentry: Sentry.captureException(new Error(logData.message))
      // - Send to LogRocket: LogRocket.captureException(new Error(logData.message))
      // - Send to your own logging database
      // - Send to external logging service (DataDog, New Relic, etc.)
      
      // For now, we just acknowledge - you can add your preferred service here
    } catch (externalError) {
      // Don't fail the request if external logging fails
      console.error('Failed to send to external logging service:', externalError);
    }
    
    return NextResponse.json({ success: true });

  } catch (error: any) {
    errorLogger.error(error, { 
      context: 'Client Error Logging API',
      clientIP: getClientIP(request),
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
