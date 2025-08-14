export async function executeGraphQL<T = any>(query: string, variables?: Record<string, any>, token?: string) {
  try {
    // Validate required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    // Use the Supabase GraphQL endpoint, usually at /graphql/v1
    const graphqlEndpoint = `${supabaseUrl}/graphql/v1`;
    
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': authHeader,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20000), // 20 second timeout for GraphQL calls
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('GraphQL request timed out:', error);
      throw new Error('Request timed out - please try again');
    }
    console.error('GraphQL Error:', error);
    throw error;
  }
} 