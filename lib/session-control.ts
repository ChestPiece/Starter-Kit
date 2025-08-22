/**
 * Session control utilities for managing forced logout behavior
 * This helps prevent redirect loops while allowing control over session expiry
 */

import { SESSION_CONFIG } from './session-config';
import { forceLogoutAndRedirect } from './auth-utils';
import { logger } from '@/lib/services/logger';

/**
 * Safely enable force logout on start
 * This sets a flag and will trigger logout on next app start
 */
export function enableForceLogoutOnStart(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('forceLogoutOnNextStart', 'true');
    logger.info('Force logout on next start enabled');
  }
}

/**
 * Disable force logout on start
 */
export function disableForceLogoutOnStart(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('forceLogoutOnNextStart');
    logger.info('Force logout on next start disabled');
  }
}

/**
 * Check if force logout should be triggered on this start
 * This is a safer alternative to the global FORCE_LOGOUT_ON_START
 */
export function shouldForceLogoutOnStart(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const forceLogout = localStorage.getItem('forceLogoutOnNextStart');
  return forceLogout === 'true';
}

/**
 * Trigger force logout if needed and clear the flag
 * Call this in UserContext to safely handle force logout
 */
export async function handleForceLogoutOnStart(): Promise<boolean> {
  if (!shouldForceLogoutOnStart()) {
    return false;
  }
  
  // Clear the flag first to prevent loops
  disableForceLogoutOnStart();
  
  // Check if already on auth page to prevent redirect loops
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/auth') || currentPath.startsWith('/login')) {
      logger.info('Already on auth page, skipping force logout redirect');
      return true; // Still counts as handled
    }
  }
  
  logger.info('Triggering force logout on start');
  await forceLogoutAndRedirect('force_logout_on_start');
  return true;
}

/**
 * Force immediate logout (for admin use or security reasons)
 */
export async function forceImmediateLogout(reason: string = 'admin_forced_logout'): Promise<void> {
  await forceLogoutAndRedirect(reason);
}

/**
 * Enable strict session mode (short timeouts, force logout on start)
 */
export function enableStrictSessionMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('strictSessionMode', 'true');
    enableForceLogoutOnStart();
    logger.info('Strict session mode enabled - shorter timeouts and force logout on start');
  }
}

/**
 * Disable strict session mode
 */
export function disableStrictSessionMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('strictSessionMode');
    disableForceLogoutOnStart();
    logger.info('Strict session mode disabled');
  }
}

/**
 * Check if strict session mode is enabled
 */
export function isStrictSessionModeEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return localStorage.getItem('strictSessionMode') === 'true';
}

/**
 * Get effective session timeout based on strict mode
 */
export function getEffectiveSessionTimeout(): number {
  if (isStrictSessionModeEnabled()) {
    return 15 * 60 * 1000; // 15 minutes in strict mode
  }
  return SESSION_CONFIG.SESSION_TIMEOUT;
}

/**
 * Get effective session warning time based on strict mode
 */
export function getEffectiveWarningTime(): number {
  if (isStrictSessionModeEnabled()) {
    return 2 * 60 * 1000; // 2 minutes warning in strict mode
  }
  return SESSION_CONFIG.SESSION_WARNING_TIME;
}
