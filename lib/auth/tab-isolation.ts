/**
 * Tab Isolation System
 * Ensures that authentication only happens in the specific tab where user performs login
 * Other tabs remain isolated unless explicitly refreshed
 */

const TAB_ID_KEY = 'tab_id';
const AUTH_TAB_KEY = 'auth_tab_id';
const TAB_SESSION_KEY = 'tab_sessions';

/**
 * Generate a unique tab ID for the current tab
 */
export function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get the current tab's unique ID
 */
export function getCurrentTabId(): string {
  if (typeof window === 'undefined') return 'server';
  
  // Check if tab already has an ID
  let tabId = sessionStorage.getItem(TAB_ID_KEY);
  
  if (!tabId) {
    tabId = generateTabId();
    sessionStorage.setItem(TAB_ID_KEY, tabId);
  }
  
  return tabId;
}

/**
 * Mark this tab as the authentication tab (where login happened)
 */
export function markAsAuthTab(): void {
  if (typeof window === 'undefined') return;
  
  const tabId = getCurrentTabId();
  localStorage.setItem(AUTH_TAB_KEY, tabId);
  
  console.log(`🔐 Tab ${tabId} marked as auth tab`);
}

/**
 * Check if current tab is the authentication tab
 */
export function isAuthTab(): boolean {
  if (typeof window === 'undefined') return true;
  
  const currentTabId = getCurrentTabId();
  const authTabId = localStorage.getItem(AUTH_TAB_KEY);
  
  return currentTabId === authTabId;
}

/**
 * Check if authentication should be allowed for this tab
 */
export function shouldAllowAuth(): boolean {
  if (typeof window === 'undefined') return true;
  
  // Allow if this is the auth tab or if no auth tab is set
  const authTabId = localStorage.getItem(AUTH_TAB_KEY);
  return !authTabId || isAuthTab();
}

/**
 * Store tab-specific session info
 */
export function setTabSession(authenticated: boolean): void {
  if (typeof window === 'undefined') return;
  
  const tabId = getCurrentTabId();
  const sessions = getTabSessions();
  
  sessions[tabId] = {
    authenticated,
    timestamp: Date.now(),
    isAuthTab: isAuthTab()
  };
  
  try {
    localStorage.setItem(TAB_SESSION_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.warn('Failed to store tab session:', error);
  }
}

/**
 * Get all tab sessions
 */
export function getTabSessions(): Record<string, { authenticated: boolean; timestamp: number; isAuthTab: boolean }> {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(TAB_SESSION_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
}

/**
 * Get current tab's session status
 */
export function getTabSession(): { authenticated: boolean; timestamp: number; isAuthTab: boolean } | null {
  const sessions = getTabSessions();
  const tabId = getCurrentTabId();
  
  return sessions[tabId] || null;
}

/**
 * Clear tab-specific session
 */
export function clearTabSession(): void {
  if (typeof window === 'undefined') return;
  
  const tabId = getCurrentTabId();
  const sessions = getTabSessions();
  
  delete sessions[tabId];
  
  try {
    localStorage.setItem(TAB_SESSION_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.warn('Failed to clear tab session:', error);
  }
}

/**
 * Clear authentication tab marker
 */
export function clearAuthTab(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(AUTH_TAB_KEY);
  console.log('🚫 Auth tab marker cleared');
}

/**
 * Check if this tab was explicitly refreshed (allows auth state sync)
 */
export function wasTabRefreshed(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if this tab was loaded via refresh (performance.navigation.type === 1)
  // or if it has no tab session but there's a global auth state
  const tabSession = getTabSession();
  return !tabSession && !!localStorage.getItem(AUTH_TAB_KEY);
}

/**
 * Initialize tab isolation for auth pages
 */
export function initializeTabIsolation(): void {
  if (typeof window === 'undefined') return;
  
  const tabId = getCurrentTabId();
  console.log(`🏷️ Tab isolation initialized for tab: ${tabId}`);
  
  // Clean up old sessions (older than 1 hour)
  const sessions = getTabSessions();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  const cleanSessions = Object.entries(sessions)
    .filter(([_, session]) => session.timestamp > oneHourAgo)
    .reduce((acc, [id, session]) => {
      acc[id] = session;
      return acc;
    }, {} as typeof sessions);
  
  if (Object.keys(cleanSessions).length !== Object.keys(sessions).length) {
    try {
      localStorage.setItem(TAB_SESSION_KEY, JSON.stringify(cleanSessions));
    } catch (error) {
      console.warn('Failed to clean old sessions:', error);
    }
  }
}

/**
 * Reset all tab isolation data (for logout)
 */
export function resetTabIsolation(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(AUTH_TAB_KEY);
  localStorage.removeItem(TAB_SESSION_KEY);
  sessionStorage.removeItem(TAB_ID_KEY);
  
  console.log('🧹 Tab isolation reset');
}
