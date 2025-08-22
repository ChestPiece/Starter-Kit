"use client";

import { getSupabaseClient } from "@/lib/supabase/singleton-client";
import { logger } from '@/lib/services/logger';

/**
 * Client-side logout utility with enhanced session clearing
 * This is used as a fallback when server actions aren't available
 */
export async function clientLogout(reason?: string) {
  const supabase = getSupabaseClient();
  
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all local storage and session storage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any cookies we can access from client-side
      // Note: This is limited due to browser security, server action is preferred
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
        // Try to clear the cookie
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      });
    }
    
    logger.info("Client logout completed");
    
    // Redirect to login
    const redirectUrl = `/auth/login${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`;
    
    if (typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
    
  } catch (error) {
    logger.error("Error during client logout:", { error });
    
    // Force redirect even if logout fails
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login?logout_error=true';
    }
  }
}

/**
 * Quick logout function that tries server action first, falls back to client logout
 */
export async function quickLogout(reason?: string) {
  try {
    // Try to import and use server action
    const { logout } = await import('@/lib/actions/auth-actions');
    await logout();
  } catch (error) {
    logger.warn("Server logout failed, falling back to client logout:", { error });
    await clientLogout(reason);
  }
}
