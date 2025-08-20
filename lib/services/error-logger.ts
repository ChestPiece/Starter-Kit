import { getLoggingConfig } from '@/lib/config/app-config';

interface ErrorLogData {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  context?: Record<string, any>;
}

class ErrorLogger {
  private config = getLoggingConfig();

  log(error: Error | string, context?: Record<string, any>, level: 'error' | 'warning' | 'info' = 'error') {
    const errorData: ErrorLogData = {
      message: typeof error === 'string' ? error : error.message,
      stack: error instanceof Error ? error.stack : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      timestamp: new Date().toISOString(),
      level,
      context,
    };

    // Log to console if enabled (consistent across environments)
    if (this.config.console && this.config.enabled) {
      const logMethod = level === 'error' ? console.error : level === 'warning' ? console.warn : console.info;
      logMethod.call(console, 'Error Logger:', errorData);
    }

    // Send to external service if configured
    if (this.config.external && this.config.enabled) {
      this.sendToExternalService(errorData);
    }

    // Always store locally for debugging (environment-agnostic)
    this.storeLocally(errorData);
  }

  private async sendToExternalService(errorData: ErrorLogData) {
    try {
      // Simple approach - just send to logs API
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      });
    } catch (error) {
      console.error('Failed to send error log to external service:', error);
    }
  }

  private storeLocally(errorData: ErrorLogData) {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('error_logs') || '[]';
      const logs = JSON.parse(stored);
      
      logs.push(errorData);
      
      // Keep only last 50 logs
      if (logs.length > 50) {
        logs.splice(0, logs.length - 50);
      }
      
      localStorage.setItem('error_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store error log locally:', error);
    }
  }

  // Method to get recent errors (useful for debugging)
  getRecentErrors(): ErrorLogData[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem('error_logs') || '[]';
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to retrieve error logs:', error);
      return [];
    }
  }

  // Method to clear stored errors
  clearLogs() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('error_logs');
  }

  // Convenient methods for different log levels
  error(error: Error | string, context?: Record<string, any>) {
    this.log(error, context, 'error');
  }

  warning(message: string, context?: Record<string, any>) {
    this.log(message, context, 'warning');
  }

  info(message: string, context?: Record<string, any>) {
    this.log(message, context, 'info');
  }
}

// Global error logger instance
export const errorLogger = new ErrorLogger();

// Global error handlers
if (typeof window !== 'undefined') {
  // Handle unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    errorLogger.error(event.error || event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.error(`Unhandled Promise Rejection: ${event.reason}`, {
      promise: event.promise,
    });
  });
}
