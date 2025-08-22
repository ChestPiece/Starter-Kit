/**
 * Data sanitization utilities for logging
 * Prevents sensitive information from being exposed in logs
 */

export interface SanitizationConfig {
  maskEmail?: boolean;
  maskTabId?: boolean;
  maskUrl?: boolean;
  maskApiKey?: boolean;
}

const DEFAULT_CONFIG: SanitizationConfig = {
  maskEmail: true,
  maskTabId: true,
  maskUrl: true,
  maskApiKey: true,
};

/**
 * Sanitizes email addresses for logging
 * @param email - The email to sanitize
 * @returns Sanitized email showing only domain
 */
export function sanitizeEmail(email: string): string {
  if (!email || !email.includes('@')) return '[invalid-email]';
  const [, domain] = email.split('@');
  return `***@${domain}`;
}

/**
 * Sanitizes tab IDs for logging
 * @param tabId - The tab ID to sanitize
 * @returns Sanitized tab ID showing only first/last characters
 */
export function sanitizeTabId(tabId: string): string {
  if (!tabId || tabId.length < 8) return '[tab-id]';
  return `${tabId.substring(0, 4)}...${tabId.substring(tabId.length - 4)}`;
}

/**
 * Sanitizes URLs for logging
 * @param url - The URL to sanitize
 * @returns Sanitized URL with sensitive parts masked
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '[url]';
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname ? '/***' : ''}`;
  } catch {
    return '[invalid-url]';
  }
}

/**
 * Sanitizes API keys for logging
 * @param apiKey - The API key to sanitize
 * @returns Sanitized API key showing only first/last characters
 */
export function sanitizeApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '[api-key]';
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}

/**
 * Creates a sanitized context object for logging
 * @param data - The data to sanitize
 * @param config - Sanitization configuration
 * @returns Sanitized data object
 */
export function sanitizeForLogging(
  data: Record<string, any>,
  config: SanitizationConfig = DEFAULT_CONFIG
): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    if (typeof value === 'string') {
      if (config.maskEmail && (lowerKey.includes('email') || value.includes('@'))) {
        sanitized[key] = sanitizeEmail(value);
      } else if (config.maskTabId && lowerKey.includes('tab')) {
        sanitized[key] = sanitizeTabId(value);
      } else if (config.maskUrl && (lowerKey.includes('url') || value.startsWith('http'))) {
        sanitized[key] = sanitizeUrl(value);
      } else if (config.maskApiKey && (lowerKey.includes('key') || lowerKey.includes('token'))) {
        sanitized[key] = sanitizeApiKey(value);
      } else {
        sanitized[key] = value;
      }
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Creates logging context with sanitized tab information
 * @param tabId - The tab ID
 * @returns Sanitized logging context
 */
export function createTabContext(tabId: string): Record<string, any> {
  return {
    tabIdHash: sanitizeTabId(tabId),
    tabType: 'browser-tab'
  };
}

/**
 * Creates logging context with sanitized email information
 * @param email - The email address
 * @returns Sanitized logging context
 */
export function createEmailContext(email: string): Record<string, any> {
  return {
    emailDomain: email.includes('@') ? email.split('@')[1] : 'unknown',
    emailType: 'user-email'
  };
}

/**
 * Creates logging context with sanitized URL information
 * @param url - The URL
 * @returns Sanitized logging context
 */
export function createUrlContext(url: string): Record<string, any> {
  try {
    const urlObj = new URL(url);
    return {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      hasPath: !!urlObj.pathname && urlObj.pathname !== '/',
      hasQuery: !!urlObj.search
    };
  } catch {
    return {
      urlType: 'invalid-url'
    };
  }
}