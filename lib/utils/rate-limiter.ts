interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  keyGenerator?: (identifier: string) => string; // Custom key generator
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly defaultOptions: RateLimitOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per window
    message: 'Too many requests, please try again later.',
  };

  // Clean up expired entries periodically
  constructor() {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  isRateLimited(identifier: string, options: Partial<RateLimitOptions> = {}): boolean {
    const opts = { ...this.defaultOptions, ...options };
    const key = opts.keyGenerator ? opts.keyGenerator(identifier) : identifier;
    const now = Date.now();
    
    let entry = this.store.get(key);

    if (!entry || now >= entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        count: 1,
        resetTime: now + opts.windowMs,
      };
      this.store.set(key, entry);
      return false;
    }

    entry.count++;
    
    if (entry.count > opts.maxRequests) {
      return true;
    }

    return false;
  }

  getRateLimitInfo(identifier: string, options: Partial<RateLimitOptions> = {}): {
    isLimited: boolean;
    remaining: number;
    resetTime: number | null;
    retryAfter: number | null;
    message: string;
  } {
    const opts = { ...this.defaultOptions, ...options };
    const key = opts.keyGenerator ? opts.keyGenerator(identifier) : identifier;
    const now = Date.now();
    const entry = this.store.get(key);
    
    if (!entry || now >= entry.resetTime) {
      return {
        isLimited: false,
        remaining: opts.maxRequests - 1,
        resetTime: now + opts.windowMs,
        retryAfter: null,
        message: 'Request allowed'
      };
    }
    
    const remaining = Math.max(0, opts.maxRequests - entry.count);
    const isLimited = entry.count >= opts.maxRequests;
    const retryAfter = isLimited ? Math.ceil((entry.resetTime - now) / 1000) : null;
    
    let message = opts.message || this.defaultOptions.message!;
    if (isLimited && retryAfter) {
      const minutes = Math.floor(retryAfter / 60);
      const seconds = retryAfter % 60;
      if (minutes > 0) {
        message += ` Please wait ${minutes} minute${minutes > 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}.`;
      } else {
        message += ` Please wait ${seconds} second${seconds !== 1 ? 's' : ''}.`;
      }
    }
    
    return {
      isLimited,
      remaining,
      resetTime: entry.resetTime,
      retryAfter,
      message
    };
  }

  getRemainingRequests(identifier: string, options: Partial<RateLimitOptions> = {}): number {
    const opts = { ...this.defaultOptions, ...options };
    const key = opts.keyGenerator ? opts.keyGenerator(identifier) : identifier;
    const entry = this.store.get(key);
    
    if (!entry) {
      return opts.maxRequests;
    }

    return Math.max(0, opts.maxRequests - entry.count);
  }

  getResetTime(identifier: string, options: Partial<RateLimitOptions> = {}): number | null {
    const opts = { ...this.defaultOptions, ...options };
    const key = opts.keyGenerator ? opts.keyGenerator(identifier) : identifier;
    const entry = this.store.get(key);
    
    return entry ? entry.resetTime : null;
  }

  reset(identifier: string, options: Partial<RateLimitOptions> = {}) {
    const opts = { ...this.defaultOptions, ...options };
    const key = opts.keyGenerator ? opts.keyGenerator(identifier) : identifier;
    this.store.delete(key);
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Common rate limit configurations
export const rateLimitConfigs = {
  // Strict rate limiting for auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
  },
  
  // Standard rate limiting for API endpoints
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: 'Too many API requests, please try again later.',
  },
  
  // Relaxed rate limiting for general requests
  general: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    message: 'Too many requests, please slow down.',
  },

  // Very strict for password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 attempts per hour
    message: 'Too many password reset attempts, please try again later.',
  },

  // Extremely strict for failed auth attempts
  authFailures: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 failed attempts per hour
    message: 'Too many failed authentication attempts. Account temporarily locked.',
  },

  // Strict for invalid tokens
  invalidTokens: {
    windowMs: 30 * 60 * 1000, // 30 minutes
    maxRequests: 5, // 5 invalid token attempts per 30 minutes
    message: 'Too many invalid token attempts, please try again later.',
  },

  // GraphQL specific
  graphql: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 20, // 20 queries per minute
    message: 'Too many GraphQL queries, please slow down.',
  },
};

// Helper function to get client IP address
export function getClientIP(request: Request): string {
  // Check various headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback
  return 'unknown';
}
