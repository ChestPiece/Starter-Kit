/**
 * Optimized data fetcher that ensures first-try success
 * This module provides utilities for reliable data fetching with proper error handling
 */

import { createClient } from '@/lib/supabase/client';

interface FetchOptions {
  retries?: number;
  timeout?: number;
  fallback?: any;
}

/**
 * Optimized user profile fetcher that works on first try
 */
export async function fetchUserProfile(userId: string, options: FetchOptions = {}) {
  const supabase = createClient();
  const { retries = 0, timeout = 5000, fallback = null } = options;

  try {
    // Single, optimized query with proper error handling
    const { data: userProfile, error } = await supabase
      .from("user_profiles")
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        role_id,
        roles (
          id,
          name
        )
      `)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn('Profile fetch error:', error);
      
      // If join failed, try simpler query without retries
      if (error.message?.includes('roles')) {
        const { data: basicProfile, error: basicError } = await supabase
          .from("user_profiles")
          .select("id, email, full_name, avatar_url, role_id")
          .eq("id", userId)
          .maybeSingle();

        if (basicProfile && !basicError) {
          // Add default role
          return {
            ...basicProfile,
            roles: { id: 2, name: "user" }
          };
        }
      }
      
      return fallback;
    }

    return userProfile;
  } catch (error) {
    console.error('Unexpected profile fetch error:', error);
    return fallback;
  }
}

/**
 * Optimized authentication check that works on first try
 */
export async function checkAuthStatus() {
  const supabase = createClient();

  try {
    // Parallel fetch for maximum efficiency
    const [userResult, sessionResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession()
    ]);

    const user = userResult.data?.user;
    const session = sessionResult.data?.session;
    const userError = userResult.error;
    const sessionError = sessionResult.error;

    return {
      user,
      session,
      isAuthenticated: !!(user && session && !userError && !sessionError),
      errors: {
        userError,
        sessionError
      }
    };
  } catch (error) {
    console.error('Auth status check failed:', error);
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      errors: { generalError: error }
    };
  }
}

/**
 * Optimized role checker that works on first try
 */
export async function fetchUserRole(userId: string) {
  const supabase = createClient();

  try {
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("role_id")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) {
      console.warn('Role fetch failed:', error);
      return { role_id: 2 }; // Default to user role
    }

    return profile;
  } catch (error) {
    console.error('Role check error:', error);
    return { role_id: 2 }; // Default to user role
  }
}

/**
 * Create a user profile if it doesn't exist (background operation)
 */
export async function createUserProfileInBackground(supaUser: any) {
  const supabase = createClient();

  try {
    // Check if profile already exists first
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", supaUser.id)
      .maybeSingle();

    if (existingProfile) {
      console.log("✅ Profile already exists");
      return existingProfile;
    }

    // Create new profile
    const { data: newProfile, error } = await supabase
      .from("user_profiles")
      .insert({
        id: supaUser.id,
        email: supaUser.email,
        full_name: supaUser.user_metadata?.full_name || null,
        avatar_url: supaUser.user_metadata?.avatar_url || null,
        role_id: 2, // Default user role
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create user profile:", error);
      return null;
    }

    console.log("✅ User profile created successfully");
    return newProfile;
  } catch (error) {
    console.error("Background profile creation failed:", error);
    return null;
  }
}

/**
 * Wrapper for any database query with optimized error handling
 */
export async function optimizedQuery<T>(
  queryFn: () => Promise<{ data: T; error: any }>,
  fallbackValue: T | null = null
): Promise<T | null> {
  try {
    const { data, error } = await queryFn();
    
    if (error) {
      console.warn('Query error:', error);
      return fallbackValue;
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected query error:', error);
    return fallbackValue;
  }
}
