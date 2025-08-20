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
  
  const currentTabId = getCurrentTabId();
  const authTabId = localStorage.getItem(AUTH_TAB_KEY);
  
  // Allow if no auth tab is set (first login)
  if (!authTabId) return true;
  
  // Allow if this is the auth tab
  if (currentTabId === authTabId) return true;
  
  // Don't allow for other tabs
  return false;
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
 * Check if auth state change should be blocked for this tab
 */
export function shouldBlockAuthStateChange(event: string): boolean {
  if (typeof window === 'undefined') return false;
  
  // Always allow sign out events
  if (event === 'SIGNED_OUT') return false;
  
  // For sign in events, only allow in the auth tab or refreshed tabs
  if (event === 'SIGNED_IN') {
    return !shouldAllowAuth() && !wasTabRefreshed();
  }
  
  // Allow token refresh for authenticated tabs
  if (event === 'TOKEN_REFRESHED') {
    return !isAuthTab() && !wasTabRefreshed();
  }
  
  return false;
}

/**
 * Force sign out in non-auth tabs to prevent cross-tab authentication
 */
export function enforceTabIsolation(supabaseClient: any): void {
  if (typeof window === 'undefined') return;
  
  if (!shouldAllowAuth() && !wasTabRefreshed()) {
    const tabId = getCurrentTabId();
    
    // Prevent multiple signout calls for the same tab
    const lastSignoutKey = `last_signout_${tabId}`;
    const lastSignout = sessionStorage.getItem(lastSignoutKey);
    const now = Date.now();
    
    // Only sign out if we haven't done so in the last 5 seconds
    if (!lastSignout || (now - parseInt(lastSignout)) > 5000) {
      console.log(`🚫 Enforcing tab isolation - signing out tab ${tabId}`);
      sessionStorage.setItem(lastSignoutKey, now.toString());
      
      // Use silent signout to prevent triggering more auth events
      supabaseClient.auth.signOut({ scope: 'local' }).catch((error: any) => {
        console.warn('Silent signout failed:', error);
      });
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
