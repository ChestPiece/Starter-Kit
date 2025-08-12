/**
 * Session configuration for authentication timeout management
 */

export const SESSION_CONFIG = {
  // Session timeout in milliseconds (30 minutes)
  SESSION_TIMEOUT: 30 * 60 * 1000,
  
  // Warning time before session expires (5 minutes before timeout)
  SESSION_WARNING_TIME: 1 * 60 * 1000,
  
  // Check session validity every 60 seconds
  SESSION_CHECK_INTERVAL: 60 * 1000,
  
  // Force logout on app start (set to true to always require fresh login)
  // Note: Setting this to true can cause redirect loops, use with caution
  FORCE_LOGOUT_ON_START: false,
  
  // Maximum session duration (24 hours) - after this, force re-authentication
  MAX_SESSION_DURATION: 24 * 60 * 60 * 1000,
  
  // Toggle session warning UI (set to false to disable the warning overlay)
  SHOW_WARNING: false,
  
  // Local storage keys for session tracking
  STORAGE_KEYS: {
    LAST_ACTIVITY: 'lastActivity',
    SESSION_START: 'sessionStart',
    SESSION_WARNING_SHOWN: 'sessionWarningShown'
  }
} as const;

export type SessionConfig = typeof SESSION_CONFIG;

/**
 * Check if session has exceeded maximum duration
 */
export function isSessionExpiredByDuration(): boolean {
  const sessionStart = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START);
  if (!sessionStart) return true;
  
  const startTime = new Date(sessionStart).getTime();
  const now = Date.now();
  const sessionDuration = now - startTime;
  
  return sessionDuration > SESSION_CONFIG.MAX_SESSION_DURATION;
}

/**
 * Check if session has exceeded timeout due to inactivity
 */
export function isSessionExpiredByInactivity(): boolean {
  const lastActivity = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
  if (!lastActivity) return true;
  
  const lastActiveTime = new Date(lastActivity).getTime();
  const now = Date.now();
  const inactiveTime = now - lastActiveTime;
  
  return inactiveTime > SESSION_CONFIG.SESSION_TIMEOUT;
}

/**
 * Update last activity timestamp
 */
export function updateLastActivity(): void {
  localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, new Date().toISOString());
}

/**
 * Initialize session tracking
 */
export function initializeSessionTracking(): void {
  const now = new Date().toISOString();
  localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START, now);
  localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY, now);
  localStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_WARNING_SHOWN);
}

/**
 * Clear all session tracking data
 */
export function clearSessionTracking(): void {
  localStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
  localStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START);
  localStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_WARNING_SHOWN);
}

/**
 * Check if session warning should be shown
 */
export function shouldShowSessionWarning(): boolean {
  if (!SESSION_CONFIG.SHOW_WARNING) return false;
  const lastActivity = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.LAST_ACTIVITY);
  const warningShown = localStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_WARNING_SHOWN);
  
  if (!lastActivity || warningShown) return false;
  
  const lastActiveTime = new Date(lastActivity).getTime();
  const now = Date.now();
  const inactiveTime = now - lastActiveTime;
  const timeUntilExpiry = SESSION_CONFIG.SESSION_TIMEOUT - inactiveTime;
  
  return timeUntilExpiry <= SESSION_CONFIG.SESSION_WARNING_TIME && timeUntilExpiry > 0;
}

/**
 * Mark session warning as shown
 */
export function markSessionWarningShown(): void {
  localStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_WARNING_SHOWN, 'true');
}
