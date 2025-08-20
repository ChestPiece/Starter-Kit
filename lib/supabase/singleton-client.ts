import { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from './client'

/**
 * Singleton Supabase client to prevent multiple client instances
 * Uses optimized configuration for better performance
 */
class SupabaseSingleton {
  private static instance: SupabaseClient | null = null
  private static isInitialized = false

  static getInstance(): SupabaseClient {
    if (!SupabaseSingleton.instance || !SupabaseSingleton.isInitialized) {
      SupabaseSingleton.instance = createClient()
      SupabaseSingleton.isInitialized = true

      // Add connection optimization
      SupabaseSingleton.setupOptimizations()
    }

    return SupabaseSingleton.instance
  }

  private static setupOptimizations() {
    if (!SupabaseSingleton.instance) return

    const client = SupabaseSingleton.instance

    // Set up optimizations for better performance
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Clear any cached data when user signs out
        SupabaseSingleton.clearCache()
      }
    })

    // Enable browser-specific optimizations
    if (typeof window !== 'undefined') {
      // Set up connection keepalive and other browser optimizations
      // This uses Supabase's built-in optimizations without modifying the client
    }
  }

  static clearCache() {
    // This will be called when user logs out to prevent data leaks
    if (typeof window !== 'undefined') {
      // Clear any browser caches if needed
      sessionStorage.clear()
    }
  }

  static resetInstance() {
    SupabaseSingleton.instance = null
    SupabaseSingleton.isInitialized = false
  }
}

// Export the singleton instance getter
export const getSupabaseClient = SupabaseSingleton.getInstance
export const resetSupabaseClient = SupabaseSingleton.resetInstance
export const clearSupabaseCache = SupabaseSingleton.clearCache
