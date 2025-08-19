import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimiter, rateLimitConfigs, getClientIP } from '@/lib/utils/rate-limiter';
import { errorLogger } from '@/lib/services/error-logger';
import { developmentLogger } from '@/lib/middleware/api-logger';

// Apply API logging middleware
const loggedPOST = developmentLogger(async (req: NextRequest) => {
  try {
    // Check rate limiting first
    const clientIP = getClientIP(req);
    if (rateLimiter.isRateLimited(clientIP, rateLimitConfigs.graphql)) {
      return NextResponse.json(
        { error: rateLimitConfigs.graphql.message },
        { status: 429 }
      );
    }

    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to access GraphQL' },
        { status: 401 }
      );
    }

    const { query, variables } = await req.json();
    
    // Validate the request
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Execute the GraphQL query using Supabase's REST API (authenticated user)
    // Get the user's session to include in the request
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/graphql/v1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        // Include authorization header if session exists
        ...(session?.access_token && {
          'Authorization': `Bearer ${session.access_token}`
        }),
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20000), // 20 second timeout
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'GraphQL query failed' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json({ data: result.data });
  } catch (error: any) {
    errorLogger.error(error, { 
      context: 'GraphQL API',
      clientIP: getClientIP(req),
    });
    
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out - please try again' },
        { status: 408 }
      );
    }
    
    // Handle connection errors
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { error: 'Connection failed - please check your network' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});

export { loggedPOST as POST }; 