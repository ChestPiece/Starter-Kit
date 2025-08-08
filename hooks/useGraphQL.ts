// Mock GraphQL hook (authentication and GraphQL backend removed)
export function useGraphQL() {
  const query = async <T = any>(query: string, variables?: Record<string, any>) => {
    try {
      // Return mock data instead of making real GraphQL queries
      console.log("Mock GraphQL query:", { query, variables });
      return {} as T;
    } catch (error) {
      console.error('Mock GraphQL Query Error:', error);
      throw error;
    }
  };

  return { query };
} 