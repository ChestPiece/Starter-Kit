"use client";

import { createClient } from "@/lib/supabase/client";
import { 
  SESSION_CONFIG,
  isSessionExpiredByDuration,
  isSessionExpiredByInactivity,
  updateLastActivity,
  initializeSessionTracking,
  clearSessionTracking,
  shouldShowSessionWarning,
  markSessionWarningShown
} from './session-config';

/**
 * Utility functions for authentication handling
 */

/**
 * Force logout and redirect to login page
 * Useful for handling session expiration or invalid sessions
 */
export const forceLogoutAndRedirect = async (reason?: string) => {
  try {
    // Clear session tracking first
    clearSessionTracking();
    
    // Try server action first (preferred method)
    try {
      const { forceLogout } = await import('@/lib/actions/auth-actions');
      await forceLogout(reason || 'session_expired');
      return; // Success, exit early
    } catch (serverError) {
      console.warn('Server logout failed, falling back to client logout:', serverError);
    }
    
    // Fallback to client logout
    const { clientLogout } = await import('@/lib/client-logout');
    await clientLogout(reason || 'session_expired');
    
  } catch (error) {
    console.error('All logout methods failed:', error);
    
    // Last resort: direct redirect
    if (typeof window !== 'undefined') {
      const redirectUrl = `/auth/login${reason ? `?reason=${encodeURIComponent(reason)}` : '?logout_error=true'}`;
      window.location.href = redirectUrl;
    }
  }
};

/**
 * Check if user session is valid with enhanced timeout validation
 * Returns true if valid, false if invalid
 */
export const validateUserSession = async (): Promise<boolean> => {
  const supabase = createClient();
  
  try {
    // Check both user and session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // User must exist, no errors, and have a valid session
    if (userError || sessionError || !user || !session) {

      return false;
    }
    
    // Check if session is not expired (Supabase session expiry)
    if (session.expires_at && new Date(session.expires_at * 1000) < new Date()) {

      return false;
    }
    
    // Skip timeout checks if we're on auth pages (user might be in the process of logging in)
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/auth') || currentPath.startsWith('/login')) {

        return true;
      }
    }
    
    // Check if session has exceeded maximum duration (disabled in production to reduce noise)
    if (typeof window !== 'undefined') {
      try {
        const disabled = localStorage.getItem('disableMaxDurationCheck') === 'true';
        if (!disabled && isSessionExpiredByDuration()) {

          return false;
        }
      } catch {}
    }
    
    // Check if session has exceeded inactivity timeout (less aggressive)
    if (typeof window !== 'undefined') {
      try {
        const disabled = localStorage.getItem('disableInactivityCheck') === 'true';
        if (!disabled && isSessionExpiredByInactivity()) {
          console.log('Session expired by inactivity');
          return false;
        }
      } catch {}
    }
    
    // Update last activity if session is valid
    if (typeof window !== 'undefined') {
      updateLastActivity();
    }
    
    return true;
  } catch (error) {
    console.error('Error validating session:', error);
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
 * Set up enhanced session monitoring with timeout tracking
 */
export const setupSessionMonitoring = () => {
  const supabase = createClient();
  
  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    // Get authenticated user data instead of using potentially insecure session.user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    console.log('Auth state changed:', event, authUser?.email);
    
    // If user signs out or session becomes invalid
    if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
      console.log('Session invalid, redirecting to login');
      clearSessionTracking();
      
      // Only redirect if not already on auth pages
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/auth') && !currentPath.startsWith('/login')) {
          window.location.href = '/auth/login?session_expired=true';
        }
      }
    }
    
    // If user signs in successfully, initialize session tracking
    if (event === 'SIGNED_IN' && session && authUser) {
      console.log('User signed in successfully, initializing session tracking');
      initializeSessionTracking();
      updateLastActivity();
      
      // Redirect to main app if on auth page
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/auth') || currentPath.startsWith('/login')) {
          console.log('Redirecting to main app after successful login');
          setTimeout(() => {
            window.location.href = '/';
          }, 100); // Small delay to ensure session is fully established
        }
      }
    }
  });
  
  // Set up periodic session validation
  if (typeof window !== 'undefined') {
    const sessionCheckInterval = setInterval(async () => {
      // Skip validation if already on auth pages to prevent loops
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/auth') || currentPath.startsWith('/login')) {
        return;
      }
      
      const isValid = await validateUserSession();
      
      if (!isValid) {
        console.log('Session validation failed during periodic check, logging out');
        clearInterval(sessionCheckInterval);
        await forceLogoutAndRedirect('session_timeout');
        return;
      }
      
      // Check if warning should be shown
      if (shouldShowSessionWarning()) {
        markSessionWarningShown();
        // Only show if explicitly enabled
        if (SESSION_CONFIG.SHOW_WARNING) {
          window.dispatchEvent(new CustomEvent('sessionWarning', {
            detail: { timeRemaining: SESSION_CONFIG.SESSION_WARNING_TIME }
          }));
        }
      }
    }, SESSION_CONFIG.SESSION_CHECK_INTERVAL);
    
    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const activityHandler = () => {
      updateLastActivity();
    };
    
    activityEvents.forEach(event => {
      window.addEventListener(event, activityHandler);
    });
    
    // Clean up on window unload
    window.addEventListener('beforeunload', () => {
      clearInterval(sessionCheckInterval);
      activityEvents.forEach(event => {
        window.removeEventListener(event, activityHandler);
      });
  });
  }
};

/**
 * Force logout on app start if configured to do so
 * This ensures users always start as unauthenticated
 */
export const forceLogoutOnAppStart = async (): Promise<void> => {
  if (!SESSION_CONFIG.FORCE_LOGOUT_ON_START) {
    return;
  }
  
  console.log('Force logout on app start enabled, clearing session');
  await forceLogoutAndRedirect('app_start_logout');
};

/**
 * Initialize authentication system with session expiry
 * Call this when the app starts
 */
export const initializeAuth = async (): Promise<void> => {
  if (typeof window === 'undefined') {
    return; // Skip on server side
  }
  
  // Force logout on app start if configured
  if (SESSION_CONFIG.FORCE_LOGOUT_ON_START) {
    clearSessionTracking();
    await forceLogoutOnAppStart();
    return;
  }
  
  // Validate existing session
  const isValid = await validateUserSession();
  
  if (!isValid) {
    console.log('Invalid session detected on app start, logging out');
    await forceLogoutAndRedirect('invalid_session_on_start');
    return;
  }
  
  // Set up session monitoring
  setupSessionMonitoring();
};

/**
 * Check if user should be logged out due to session expiry
 * Returns reason for logout or null if session is valid
 */
export const checkSessionExpiry = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (isSessionExpiredByDuration()) {
    return 'Session expired - maximum duration exceeded';
  }
  
  if (isSessionExpiredByInactivity()) {
    return 'Session expired - inactivity timeout';
  }
  
  return null;
};
