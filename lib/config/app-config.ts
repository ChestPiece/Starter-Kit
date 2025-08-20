/**
 * Unified Application Configuration
 * This ensures consistent behavior across development and production environments
 * No environment-specific code - everything works the same way everywhere
 */

interface AppConfig {
  // Logging configuration
  logging: {
    enabled: boolean;
    level: 'error' | 'warn' | 'info' | 'debug';
    console: boolean;
    external: boolean;
  };
  
  // API configuration
  api: {
    timeout: number;
    retries: number;
    rateLimit: boolean;
  };
  
  // Security configuration
  security: {
    auditLogging: boolean;
    csrfProtection: boolean;
    rateLimiting: boolean;
  };
  
  // Performance configuration
  performance: {
    caching: boolean;
    optimization: boolean;
    prefetch: boolean;
  };
  
  // Feature flags (environment-agnostic)
  features: {
    realTimeUpdates: boolean;
    errorReporting: boolean;
    analytics: boolean;
  };
}

/**
 * Default configuration that works in all environments
 * Can be overridden via environment variables, but defaults are safe
 */
const defaultConfig: AppConfig = {
  logging: {
    enabled: true, // Always enabled
    level: (process.env.LOG_LEVEL as any) || 'info',
    console: true, // Always log to console
    external: process.env.EXTERNAL_LOGGING_URL ? true : false,
  },
  
  api: {
    timeout: parseInt(process.env.API_TIMEOUT || '15000'),
    retries: parseInt(process.env.API_RETRIES || '3'),
    rateLimit: true, // Always enabled for security
  },
  
  security: {
    auditLogging: true, // Always enabled for compliance
    csrfProtection: true, // Always enabled for security
    rateLimiting: true, // Always enabled for protection
  },
  
  performance: {
    caching: true, // Always enabled for performance
    optimization: true, // Always enabled
    prefetch: process.env.DISABLE_PREFETCH !== 'true',
  },
  
  features: {
    realTimeUpdates: process.env.DISABLE_REALTIME !== 'true',
    errorReporting: true, // Always enabled
    analytics: process.env.DISABLE_ANALYTICS !== 'true',
  },
};

/**
 * Get application configuration
 * Returns the same configuration regardless of environment
 */
export function getAppConfig(): AppConfig {
  return defaultConfig;
}

/**
 * Check if a feature is enabled
 * @param feature - Feature name to check
 */
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  return defaultConfig.features[feature];
}

/**
 * Get logging configuration
 */
export function getLoggingConfig() {
  return defaultConfig.logging;
}

/**
 * Get security configuration
 */
export function getSecurityConfig() {
  return defaultConfig.security;
}

/**
 * Get API configuration
 */
export function getApiConfig() {
  return defaultConfig.api;
}

/**
 * Validate that the application is configured correctly
 * Works the same way in all environments
 */
export function validateAppConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }
  
  // Validate configuration values
  if (defaultConfig.api.timeout < 1000) {
    errors.push('API timeout must be at least 1000ms');
  }
  
  if (defaultConfig.api.retries < 0 || defaultConfig.api.retries > 10) {
    errors.push('API retries must be between 0 and 10');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get environment-agnostic display name for current setup
 */
export function getEnvironmentInfo() {
  const validation = validateAppConfig();
  
  return {
    isConfigured: validation.isValid,
    hasSupabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasExternalLogging: !!process.env.EXTERNAL_LOGGING_URL,
    features: Object.entries(defaultConfig.features)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name),
    errors: validation.errors
  };
}
