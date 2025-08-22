import { logger } from '@/lib/services/logger';

/**
 * Utility to prevent automatic redirects and ensure users explicitly choose to enter the app
 */

/**
 * Check if current page is an auth page where users should stay even if authenticated
 */
export function isAuthPage(): boolean {
  if (typeof window === 'undefined') return false;
  
  const pathname = window.location.pathname;
  return pathname.startsWith('/auth') || pathname.startsWith('/login');
}

/**
 * Check if we should prevent automatic redirects
 */
export function shouldPreventAutoRedirect(): boolean {
  return isAuthPage();
}

/**
 * Safe redirect that only works when user explicitly takes an action
 */
export function safeRedirect(url: string, requireUserAction: boolean = true): void {
  if (typeof window === 'undefined') return;
  
  if (requireUserAction && isAuthPage()) {
    logger.info('🚫 Automatic redirect prevented - user must explicitly choose to enter app');
    return;
  }
  
  window.location.href = url;
}

/**
 * Clear any stored redirect URLs to prevent automatic redirections
 */
export function clearStoredRedirects(): void {
  if (typeof window === 'undefined') return;
  
  // Clear any stored redirect URLs from localStorage or sessionStorage
  try {
    localStorage.removeItem('redirectUrl');
    localStorage.removeItem('pendingRedirect');
    sessionStorage.removeItem('redirectUrl');
    sessionStorage.removeItem('pendingRedirect');
  } catch (error) {
    // Silent error - storage might not be available
  }
}

/**
 * Initialize anti-auto-redirect measures
 */
export function initializeAutoRedirectPrevention(): void {
  if (typeof window === 'undefined') return;
  
  // Clear any stored redirects on page load
  clearStoredRedirects();
  
  // Prevent automatic redirects on auth state changes for auth pages
  if (isAuthPage()) {
    logger.info('🔒 Auto-redirect prevention active on auth page');
  }
}
