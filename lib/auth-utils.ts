"use client";

import { getSupabaseClient } from "@/lib/supabase/singleton-client";
import { logger } from '@/lib/services/logger';

/**
 * Utility functions for authentication handling
 */

/**
 * Force logout and redirect to login page
 * Useful for handling session expiration or invalid sessions
 */
export const forceLogoutAndRedirect = async (reason?: string) => {
  try {
    // Clear any session storage
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    
    // Try server action first (preferred method)
    try {
      const { forceLogout } = await import('@/lib/actions/auth-actions');
      await forceLogout(reason || 'session_expired');
      return; // Success, exit early
    } catch (serverError) {
      logger.warn('Server logout failed, falling back to client logout:', serverError);
    }
    
    // Fallback to client logout
    const { clientLogout } = await import('@/lib/client-logout');
    await clientLogout(reason || 'session_expired');
    
  } catch (error) {
    logger.error('All logout methods failed:', { error });
    
    // Last resort: direct redirect
    if (typeof window !== 'undefined') {
      const redirectUrl = `/auth/login${reason ? `?reason=${encodeURIComponent(reason)}` : '?logout_error=true'}`;
      window.location.href = redirectUrl;
    }
  }
};

/**
 * Check if user session is valid using Supabase native validation only
 * Returns true if valid, false if invalid
 */
export const validateUserSession = async (): Promise<boolean> => {
  const supabase = getSupabaseClient();
  
  try {
    // Use Supabase's built-in session validation
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // User must exist, no errors, and have a valid session
    if (userError || sessionError || !user || !session) {
      return false;
    }
    
    // Check if session is not expired (Supabase handles this automatically)
    if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Error validating session:', { error });
    return false;
  }
};

/**
 * Redirect unauthenticated users to login
 * Can be used in components to protect routes
 */
export const redirectToLoginIfUnauthenticated = async () => {
  const isValid = await validateUserSession();
  
  if (!isValid) {
    window.location.href = '/auth/login';
    return false;
  }
  
  return true;
};

/**
 * Set up Supabase-native auth state monitoring (no custom polling)
 */
export const setupSessionMonitoring = () => {
  const supabase = getSupabaseClient();
  
  // Listen for Supabase auth state changes only
  supabase.auth.onAuthStateChange(async (event, session) => {
    // Only log significant auth events
    if (event !== 'INITIAL_SESSION') {
      logger.info(`🔐 Auth event: ${event}`);
    }
    
    // Handle sign out or invalid session
    if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
      logger.info('Session ended, redirecting to login');
      
      // Only redirect if not already on auth pages
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/auth') && !currentPath.startsWith('/login')) {
          window.location.href = '/auth/login?session_expired=true';
        }
      }
    }
    
    // Handle successful sign in
    if (event === 'SIGNED_IN' && session) {
      logger.info('User signed in successfully');
      
      // Redirect to main app if on auth page
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/auth') || currentPath.startsWith('/login')) {
          logger.info('Redirecting to main app after successful login');
          setTimeout(() => {
            window.location.href = '/';
          }, 100);
        }
      }
    }
  });
};

/**
 * Initialize authentication system using Supabase native methods
 * Call this when the app starts
 */
export const initializeAuth = async (): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // Skip on server side
  }
  
  // Set up Supabase auth state monitoring
  setupSessionMonitoring();
};


