export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  source?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  stack?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableExternal: boolean;
  externalEndpoint?: string;
  sensitiveKeys: string[];
  enableLocalStorage: boolean;
  maxLocalStorageLogs: number;
}

class LoggerService {
  private config: LoggerConfig;
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    critical: 4
  };

  constructor() {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      enableConsole: process.env.NODE_ENV === 'development',
      enableExternal: process.env.ENABLE_EXTERNAL_LOGGING === 'true',
      externalEndpoint: process.env.EXTERNAL_LOG_ENDPOINT,
      enableLocalStorage: typeof window !== 'undefined',
      maxLocalStorageLogs: 50,
      sensitiveKeys: [
        'password', 'token', 'secret', 'key', 'auth', 'credential',
        'authorization', 'cookie', 'session', 'csrf', 'api_key'
      ]
    };
    
    // Set up global error handlers if in browser (deferred to avoid constructor issues)
    if (typeof window !== 'undefined') {
      setTimeout(() => this.setupGlobalErrorHandlers(), 0);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.config.level];
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    for (const [key, value] of Object.entries(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (this.config.sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      }
    }
    
    return sanitized;
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, context, source } = entry;
    const contextStr = context ? ` | Context: ${JSON.stringify(this.sanitizeData(context))}` : '';
    const sourceStr = source ? ` | Source: ${source}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${sourceStr} ${message}${contextStr}`;
  }

  private getLogColor(level: LogLevel): string {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
      critical: '\x1b[35m' // Magenta
    };
    return colors[level] || '\x1b[0m';
  }

  private async writeToConsole(entry: LogEntry): Promise<void> {
    if (!this.config.enableConsole) return;

    const color = this.getLogColor(entry.level);
    const reset = '\x1b[0m';
    const formatted = this.formatLogEntry(entry);
    
    if (entry.level === 'error' || entry.level === 'critical') {
      console.error(`${color}${formatted}${reset}`);
      if (entry.stack) {
        console.error(`${color}Stack: ${entry.stack}${reset}`);
      }
    } else if (entry.level === 'warn') {
      console.warn(`${color}${formatted}${reset}`);
    } else {
      console.log(`${color}${formatted}${reset}`);
    }
  }



  private async sendToExternal(entry: LogEntry): Promise<void> {
    if (!this.config.enableExternal || !this.config.externalEndpoint) return;

    try {
      const response = await fetch(this.config.externalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXTERNAL_LOG_TOKEN || ''}`
        },
        body: JSON.stringify({
          ...entry,
          context: this.sanitizeData(entry.context),
          environment: process.env.NODE_ENV,
          service: 'kaizen-cma'
        })
      });

      if (!response.ok) {
        throw new Error(`External logging failed: ${response.status}`);
      }
    } catch (error) {
      // Don't log to external service if it fails (avoid infinite loops)
      if (this.config.enableConsole) {
        console.error('Failed to send log to external service:', error);
      }
    }
  }

  private storeInLocalStorage(entry: LogEntry): void {
    if (!this.config.enableLocalStorage || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('app_logs') || '[]';
      const logs = JSON.parse(stored);
      
      logs.push(entry);
      
      // Keep only the most recent logs
      if (logs.length > this.config.maxLocalStorageLogs) {
        logs.splice(0, logs.length - this.config.maxLocalStorageLogs);
      }
      
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (error) {
      if (this.config.enableConsole) {
        console.error('Failed to store log in localStorage:', error);
      }
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled JavaScript error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      }, 'global-error-handler');
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise
      }, 'global-error-handler');
    });
  }

  private async log(level: LogLevel, message: string, context?: Record<string, any>, source?: string): Promise<void> {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? this.sanitizeData(context) : undefined,
      source,
      userId: context?.userId,
      sessionId: context?.sessionId,
      requestId: context?.requestId,
      stack: level === 'error' || level === 'critical' ? new Error().stack : undefined
    };

    // Execute all logging methods in parallel
    await Promise.allSettled([
      this.writeToConsole(entry),
      this.sendToExternal(entry)
    ]);
    
    // Store in localStorage (synchronous)
    this.storeInLocalStorage(entry);
  }

  // Public logging methods
  async debug(message: string, context?: Record<string, any>, source?: string): Promise<void> {
    await this.log('debug', message, context, source);
  }

  async info(message: string, context?: Record<string, any>, source?: string): Promise<void> {
    await this.log('info', message, context, source);
  }

  async warn(message: string, context?: Record<string, any>, source?: string): Promise<void> {
    await this.log('warn', message, context, source);
  }

  async error(message: string, context?: Record<string, any>, source?: string): Promise<void> {
    await this.log('error', message, context, source);
  }

  async critical(message: string, context?: Record<string, any>, source?: string): Promise<void> {
    await this.log('critical', message, context, source);
  }

  // Convenience methods for common patterns
  async logAuthEvent(event: string, context?: Record<string, any>): Promise<void> {
    await this.info(`Auth event: ${event}`, context, 'auth');
  }

  async logApiRequest(method: string, path: string, context?: Record<string, any>): Promise<void> {
    await this.info(`API ${method} ${path}`, context, 'api');
  }

  async logDatabaseOperation(operation: string, table: string, context?: Record<string, any>): Promise<void> {
    await this.debug(`DB ${operation} on ${table}`, context, 'database');
  }

  async logSecurityEvent(event: string, context?: Record<string, any>): Promise<void> {
    await this.warn(`Security event: ${event}`, context, 'security');
  }

  async logPerformance(operation: string, duration: number, context?: Record<string, any>): Promise<void> {
    await this.info(`Performance: ${operation} took ${duration}ms`, context, 'performance');
  }

  // Configuration methods
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  // Methods for managing stored logs
  getStoredLogs(): LogEntry[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem('app_logs') || '[]';
      return JSON.parse(stored);
    } catch (error) {
      if (this.config.enableConsole) {
        console.error('Failed to retrieve stored logs:', error);
      }
      return [];
    }
  }

  clearStoredLogs(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('app_logs');
  }

  // Enhanced error logging methods
  async logError(error: Error | string, context?: Record<string, any>, source?: string): Promise<void> {
    const errorContext = {
      ...context,
      stack: error instanceof Error ? error.stack : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    };
    
    await this.error(typeof error === 'string' ? error : error.message, errorContext, source);
  }

  async logWarning(message: string, context?: Record<string, any>, source?: string): Promise<void> {
    await this.warn(message, context, source);
  }

  async logInfo(message: string, context?: Record<string, any>, source?: string): Promise<void> {
    await this.info(message, context, source);
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, any> }> {
    const details: Record<string, any> = {
      level: this.config.level,
      console: this.config.enableConsole,
      localStorage: this.config.enableLocalStorage,
      external: this.config.enableExternal
    };

    if (this.config.enableExternal && this.config.externalEndpoint) {
      try {
        const response = await fetch(this.config.externalEndpoint + '/health', {
          method: 'GET',
          timeout: 5000
        });
        details.externalHealth = response.ok ? 'healthy' : 'unhealthy';
      } catch {
        details.externalHealth = 'unhealthy';
      }
    }

    return {
      status: 'healthy',
      details
    };
  }
}

// Export singleton instance
export const logger = new LoggerService();
export default logger;

// Compatibility exports for error-logger functionality
export const errorLogger = {
  log: (error: Error | string, context?: Record<string, any>, level: 'error' | 'warning' | 'info' = 'error') => {
    switch (level) {
      case 'error':
        return logger.logError(error, context, 'error-logger-compat');
      case 'warning':
        return logger.logWarning(typeof error === 'string' ? error : error.message, context, 'error-logger-compat');
      case 'info':
        return logger.logInfo(typeof error === 'string' ? error : error.message, context, 'error-logger-compat');
    }
  },
  error: (error: Error | string, context?: Record<string, any>) => {
    return logger.logError(error, context, 'error-logger-compat');
  },
  warning: (message: string, context?: Record<string, any>) => {
    return logger.logWarning(message, context, 'error-logger-compat');
  },
  info: (message: string, context?: Record<string, any>) => {
    return logger.logInfo(message, context, 'error-logger-compat');
  },
  getRecentErrors: () => {
    return logger.getStoredLogs().filter(log => log.level === 'error' || log.level === 'critical');
  },
  clearLogs: () => {
    return logger.clearStoredLogs();
  }
};

// Export types for external use
export type { LoggerConfig, LogEntry };