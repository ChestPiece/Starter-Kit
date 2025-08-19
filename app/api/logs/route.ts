import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, rateLimitConfigs, getClientIP } from '@/lib/utils/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Check rate limiting
    const clientIP = getClientIP(request);
    if (rateLimiter.isRateLimited(clientIP, rateLimitConfigs.api)) {
      return NextResponse.json(
        { error: rateLimitConfigs.api.message },
        { status: 429 }
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

    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('Client Error Log:', logData);
      return NextResponse.json({ success: true });
    }

    // In production, you can send to your preferred logging service
    // Examples:
    // - Send to Sentry
    // - Send to LogRocket
    // - Send to your own logging database
    // - Send to external logging service (DataDog, New Relic, etc.)
    
    // For now, we'll just acknowledge the log
    // You can implement your preferred logging solution here
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error logging API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
