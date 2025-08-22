import { logger } from '@/lib/services/logger';

export async function executeGraphQLBackend<T = any>(query: string, variables?: Record<string, any>) {
  try {
    // Use relative URL for internal API calls to avoid needing NEXT_PUBLIC_APP_URL
    const apiUrl = typeof window !== 'undefined' 
      ? '/api/graphql' 
      : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/graphql`;
      
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }

    return result.data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error('GraphQL server request timed out:', { error });
      throw new Error('Request timed out - please try again');
    }
    logger.error('GraphQL Error:', { error });
    throw error;
  }
}