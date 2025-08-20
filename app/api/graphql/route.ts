import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimiter, rateLimitConfigs, getClientIP } from '@/lib/utils/rate-limiter';
import { errorLogger } from '@/lib/services/error-logger';
import { developmentLogger } from '@/lib/middleware/api-logger';
import { auditLogger, extractAuditContext } from '@/lib/services/audit-logger';

// Apply API logging middleware
const loggedPOST = developmentLogger(async (req: NextRequest) => {
  try {
    // Check rate limiting first
    const clientIP = getClientIP(req);
    const rateLimitInfo = rateLimiter.getRateLimitInfo(clientIP, rateLimitConfigs.graphql);
    
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
            'Retry-After': rateLimitInfo.retryAfter?.toString() || '60',
            'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
            'X-RateLimit-Reset': rateLimitInfo.resetTime?.toString() || ''
          }
        }
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

    // Extract audit context
    const auditContext = extractAuditContext(req, {
      id: user.id,
      email: user.email || 'unknown@example.com'
    });

    // Detect if this is a sensitive mutation that needs auditing
    const isMutation = query.trim().toLowerCase().startsWith('mutation');
    const sensitiveOperations = [
      'insertintouser_profilescollection',
      'updateuser_profilecollection', 
      'deletefromuser_profilecollection',
      'insertuuser',
      'updateuser',
      'deleteuser',
      'updatesettingscollection',
      'insertintosettingscollection'
    ];

    const queryLower = query.toLowerCase().replace(/\s+/g, '');
    const isSensitiveOperation = sensitiveOperations.some(op => 
      queryLower.includes(op.toLowerCase())
    );

    // Log sensitive operations before execution
    if (isMutation && isSensitiveOperation) {
      const operationType = queryLower.includes('user') ? 'user' : 
                           queryLower.includes('role') ? 'role' : 
                           queryLower.includes('settings') ? 'settings' : 'unknown';
      
      const action = queryLower.includes('insert') ? 'CREATE' :
                    queryLower.includes('update') ? 'UPDATE' :
                    queryLower.includes('delete') ? 'DELETE' : 'READ';

      // Pre-execution audit log
      await auditLogger.log(
        `GraphQL ${action} ${operationType}`,
        operationType,
        action,
        auditContext,
        { 
          query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
          variables: variables || {}
        },
        variables?.id || null,
        true, // Will update this after execution
        undefined,
        { preExecution: true }
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
    
    // Post-execution audit log for sensitive operations
    if (isMutation && isSensitiveOperation) {
      const operationType = queryLower.includes('user') ? 'user' : 
                           queryLower.includes('role') ? 'role' : 
                           queryLower.includes('settings') ? 'settings' : 'unknown';
      
      const action = queryLower.includes('insert') ? 'CREATE' :
                    queryLower.includes('update') ? 'UPDATE' :
                    queryLower.includes('delete') ? 'DELETE' : 'READ';

      const success = !result.errors && result.data;
      const errorMessage = result.errors ? 
        result.errors.map((e: any) => e.message).join(', ') : undefined;

      await auditLogger.log(
        `GraphQL ${action} ${operationType} - Completed`,
        operationType,
        action,
        auditContext,
        { 
          affectedCount: result.data ? (Object.values(result.data)[0] as any)?.affectedCount || 0 : 0,
          hasErrors: !!result.errors
        },
        variables?.id || null,
        success,
        errorMessage,
        { postExecution: true }
      );
    }
    
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