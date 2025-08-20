import { NextRequest, NextResponse } from 'next/server';
import { errorLogger } from '@/lib/services/error-logger';

interface LogData {
  requestId: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
  userAgent: string;
  clientIP: string;
  timestamp: string;
  duration?: number;
  statusCode?: number;
  responseSize?: number;
  error?: string;
}

interface ApiLoggerConfig {
  enabled: boolean;
  logLevel: 'basic' | 'detailed' | 'full';
  excludeRoutes: string[];
  excludeHeaders: string[];
  maskSensitiveData: boolean;
  maxBodySize: number; // in bytes
  logToFile: boolean;
  logToConsole: boolean;
  logToExternal: boolean;
}

const defaultConfig: ApiLoggerConfig = {
  enabled: process.env.API_LOGGING !== 'false', // Enabled by default, can be disabled with API_LOGGING=false
  logLevel: 'detailed',
  excludeRoutes: ['/api/health', '/api/_next'],
  excludeHeaders: [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'x-csrf-token'
  ],
  maskSensitiveData: true,
  maxBodySize: 1024 * 50, // 50KB
  logToFile: false,
  logToConsole: true,
  logToExternal: false,
};

class ApiLogger {
  private config: ApiLoggerConfig;
  private sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'credential',
    'session',
    'csrf',
    'ssn',
    'credit_card',
    'email',
    'phone'
  ];

  constructor(config: Partial<ApiLoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  shouldLog(request: NextRequest): boolean {
    if (!this.config.enabled) return false;
    
    const pathname = request.nextUrl.pathname;
    return !this.config.excludeRoutes.some(route => 
      pathname.startsWith(route)
    );
  }

  maskSensitiveData(obj: any, depth: number = 0): any {
    if (depth > 10 || !this.config.maskSensitiveData) return obj;
    
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSensitiveData(item, depth + 1));
    }
    
    const masked: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      const isSensitive = this.sensitiveKeys.some(sensitiveKey => 
        keyLower.includes(sensitiveKey)
      );
      
      if (isSensitive) {
        masked[key] = '[MASKED]';
      } else if (typeof value === 'object') {
        masked[key] = this.maskSensitiveData(value, depth + 1);
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }

  filterHeaders(headers: Headers): Record<string, string> {
    const filtered: Record<string, string> = {};
    
    for (const [key, value] of headers.entries()) {
      const keyLower = key.toLowerCase();
      if (!this.config.excludeHeaders.includes(keyLower)) {
        filtered[key] = value;
      } else {
        filtered[key] = '[EXCLUDED]';
      }
    }
    
    return filtered;
  }

  getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (forwarded) return forwarded.split(',')[0].trim();
    if (realIP) return realIP;
    if (cfConnectingIP) return cfConnectingIP;
    
    return 'unknown';
  }

  async extractBody(request: NextRequest): Promise<any> {
    try {
      const contentType = request.headers.get('content-type') || '';
      
      if (!contentType.includes('application/json')) {
        return { type: contentType, content: '[NON-JSON]' };
      }
      
      const text = await request.text();
      if (text.length > this.config.maxBodySize) {
        return { content: '[BODY TOO LARGE]', size: text.length };
      }
      
      if (!text) return null;
      
      const parsed = JSON.parse(text);
      return this.maskSensitiveData(parsed);
      
    } catch (error) {
      return { error: 'Failed to parse body', content: '[PARSE ERROR]' };
    }
  }

  createLogData(request: NextRequest, requestId: string): LogData {
    const url = new URL(request.url);
    const query: Record<string, string> = {};
    
    url.searchParams.forEach((value, key) => {
      query[key] = this.config.maskSensitiveData && 
        this.sensitiveKeys.some(sk => key.toLowerCase().includes(sk)) 
        ? '[MASKED]' : value;
    });

    return {
      requestId,
      method: request.method,
      url: `${url.pathname}${url.search}`,
      headers: this.filterHeaders(request.headers),
      query,
      userAgent: request.headers.get('user-agent') || 'unknown',
      clientIP: this.getClientIP(request),
      timestamp: new Date().toISOString(),
    };
  }

  async logRequest(request: NextRequest, requestId: string): Promise<LogData> {
    if (!this.shouldLog(request)) {
      return {} as LogData;
    }

    const logData = this.createLogData(request, requestId);
    
    // Extract body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        logData.body = await this.extractBody(request);
      } catch (error) {
        logData.body = { error: 'Failed to extract body' };
      }
    }

    await this.writeLog('REQUEST', logData);
    return logData;
  }

  async logResponse(
    response: NextResponse, 
    logData: LogData, 
    startTime: number,
    error?: Error
  ): Promise<void> {
    if (!this.shouldLog({ nextUrl: { pathname: logData.url } } as any)) {
      return;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const responseLogData = {
      ...logData,
      duration,
      statusCode: response.status,
      responseSize: response.headers.get('content-length') 
        ? parseInt(response.headers.get('content-length')!) 
        : undefined,
      error: error?.message,
    };

    // Log response body for errors or detailed logging
    if (this.config.logLevel === 'full' || (error && response.status >= 400)) {
      try {
        const responseText = await response.clone().text();
        if (responseText.length <= this.config.maxBodySize) {
          try {
            const responseBody = JSON.parse(responseText);
            (responseLogData as any).responseBody = this.maskSensitiveData(responseBody);
          } catch {
            (responseLogData as any).responseBody = { content: '[NON-JSON]' };
          }
        } else {
          (responseLogData as any).responseBody = { content: '[RESPONSE TOO LARGE]' };
        }
      } catch {
        (responseLogData as any).responseBody = { error: 'Failed to read response' };
      }
    }

    await this.writeLog(error ? 'ERROR' : 'RESPONSE', responseLogData);
  }

  private async writeLog(type: 'REQUEST' | 'RESPONSE' | 'ERROR', data: LogData): Promise<void> {
    const logEntry = {
      type,
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    // Console logging
    if (this.config.logToConsole) {
      const emoji = type === 'REQUEST' ? '📤' : type === 'ERROR' ? '❌' : '📥';
      const color = type === 'ERROR' ? '\x1b[31m' : type === 'REQUEST' ? '\x1b[36m' : '\x1b[32m';
      const reset = '\x1b[0m';
      
      console.log(`${color}${emoji} API ${type}${reset}`, {
        id: data.requestId,
        method: data.method,
        url: data.url,
        status: data.statusCode,
        duration: data.duration ? `${data.duration}ms` : undefined,
        ip: data.clientIP,
        ...(type === 'ERROR' && { error: data.error }),
      });

      if (this.config.logLevel === 'full') {
        console.log(`${color}Full Details:${reset}`, logEntry);
      }
    }

    // File logging (if enabled)
    if (this.config.logToFile) {
      await this.writeToFile(logEntry);
    }

    // External service logging (if enabled)
    if (this.config.logToExternal) {
      await this.sendToExternalService(logEntry);
    }
  }

  private async writeToFile(logEntry: any): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const logsDir = path.join(process.cwd(), 'logs');
      await fs.mkdir(logsDir, { recursive: true });
      
      const date = new Date().toISOString().split('T')[0];
      const logFile = path.join(logsDir, `api-${date}.log`);
      
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(logFile, logLine);
      
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  private async sendToExternalService(logEntry: any): Promise<void> {
    try {
      // Example: Send to external logging service
      // You can integrate with services like:
      // - Logtail
      // - DataDog
      // - New Relic
      // - Custom logging endpoint
      
      const loggingEndpoint = process.env.EXTERNAL_LOGGING_ENDPOINT;
      if (!loggingEndpoint) return;
      
      await fetch(loggingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LOGGING_SERVICE_TOKEN}`,
        },
        body: JSON.stringify(logEntry),
      });
      
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }
}

// Middleware function factory
export function createApiLogger(config?: Partial<ApiLoggerConfig>) {
  const logger = new ApiLogger(config);

  return function apiLoggerMiddleware(
    handler: (req: NextRequest) => Promise<NextResponse>
  ) {
    return async function(request: NextRequest): Promise<NextResponse> {
      if (!logger.shouldLog(request)) {
        return handler(request);
      }

      const requestId = logger.generateRequestId();
      const startTime = Date.now();
      
      // Clone request for body extraction
      const requestClone = request.clone();
      
      try {
        // Log request
        const logData = await logger.logRequest(request, requestId);
        
        // Add request ID to headers
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-request-id', requestId);
        
        const modifiedRequest = new NextRequest(request, {
          headers: requestHeaders,
        });

        // Execute handler
        const response = await handler(modifiedRequest);
        
        // Add request ID to response headers
        response.headers.set('x-request-id', requestId);
        
        // Log response
        await logger.logResponse(response, logData, startTime);
        
        return response;
        
      } catch (error) {
        const errorResponse = NextResponse.json(
          { error: 'Internal Server Error', requestId },
          { status: 500 }
        );
        
        errorResponse.headers.set('x-request-id', requestId);
        
        // Log error
        await logger.logResponse(errorResponse, {} as LogData, startTime, error as Error);
        
        // Also log to error logger
        errorLogger.error(error as Error, {
          context: 'API Logger Middleware',
          requestId,
          url: request.url,
          method: request.method,
        });
        
        return errorResponse;
      }
    };
  };
}

// Pre-configured loggers for different environments
export const developmentLogger = createApiLogger({
  enabled: true,
  logLevel: 'full',
  logToConsole: true,
  logToFile: false,
  maskSensitiveData: true,
});

export const productionLogger = createApiLogger({
  enabled: true,
  logLevel: 'basic',
  logToConsole: false,
  logToFile: true,
  logToExternal: true,
  maskSensitiveData: true,
});

export const debugLogger = createApiLogger({
  enabled: true,
  logLevel: 'full',
  logToConsole: true,
  logToFile: true,
  maskSensitiveData: false,
});

export { ApiLogger };
