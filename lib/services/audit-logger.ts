import { getSecurityConfig, getLoggingConfig } from '@/lib/config/app-config';

/**
 * Audit logging service for tracking sensitive operations
 * Helps with compliance, security monitoring, and debugging
 */

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string | null;
  userEmail: string | null;
  operation: string;
  resource: string;
  resourceId: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

interface AuditContext {
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 audit logs in memory
  private securityConfig = getSecurityConfig();
  private loggingConfig = getLoggingConfig();

  /**
   * Generate a unique ID for audit log entries
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log a sensitive operation
   */
  async log(
    operation: string,
    resource: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ',
    context: AuditContext,
    details: Record<string, any> = {},
    resourceId: string | null = null,
    success: boolean = true,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userId: context.userId || null,
      userEmail: context.userEmail || null,
      operation,
      resource,
      resourceId,
      action,
      details: this.sanitizeDetails(details),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      success,
      errorMessage,
      metadata
    };

    // Store in memory (for development and immediate access)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest entry
    }

    // Log audit events if security audit logging is enabled
    if (this.securityConfig.auditLogging && this.loggingConfig.console) {
      const emoji = success ? '📋' : '❌';
      const color = success ? '\x1b[34m' : '\x1b[31m';
      const reset = '\x1b[0m';
      
      console.log(`${color}${emoji} AUDIT LOG${reset}`, {
        operation,
        resource,
        action,
        user: context.userEmail || context.userId,
        success,
        timestamp: entry.timestamp
      });
    }

    // Store persistently
    await this.persistLog(entry);
  }

  /**
   * Remove sensitive information from details
   */
  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    for (const key in sanitized) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Persist audit log to storage
   */
  private async persistLog(entry: AuditLogEntry): Promise<void> {
    try {
      // Store in file if external logging is not configured
      if (!this.loggingConfig.external) {
        await this.writeToFile(entry);
        return;
      }

      // In production, you can:
      // 1. Store in database
      // 2. Send to external audit service
      // 3. Store in dedicated audit storage
      
      await this.storeInDatabase(entry);
      
    } catch (error) {
      console.error('Failed to persist audit log:', error);
      // Don't throw error to avoid breaking main operation
    }
  }

  /**
   * Write audit log to file (development)
   */
  private async writeToFile(entry: AuditLogEntry): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const auditDir = path.join(process.cwd(), 'logs', 'audit');
      await fs.mkdir(auditDir, { recursive: true });
      
      const date = new Date().toISOString().split('T')[0];
      const auditFile = path.join(auditDir, `audit-${date}.log`);
      
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(auditFile, logLine);
      
    } catch (error) {
      console.error('Failed to write audit log to file:', error);
    }
  }

  /**
   * Store audit log (simplified)
   */
  private async storeInDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      // Just send to existing logs API - keep it simple
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `AUDIT: ${entry.operation}`,
          timestamp: entry.timestamp,
          level: 'info',
          context: entry
        }),
      });
    } catch (error) {
      console.error('Failed to store audit log:', error);
    }
  }

  /**
   * Get recent audit logs (for admin dashboard)
   */
  getRecentLogs(limit: number = 50): AuditLogEntry[] {
    return this.logs
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Search audit logs by criteria
   */
  searchLogs(criteria: {
    userId?: string;
    resource?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }): AuditLogEntry[] {
    return this.logs.filter(log => {
      if (criteria.userId && log.userId !== criteria.userId) return false;
      if (criteria.resource && log.resource !== criteria.resource) return false;
      if (criteria.action && log.action !== criteria.action) return false;
      
      const logDate = new Date(log.timestamp);
      if (criteria.startDate && logDate < criteria.startDate) return false;
      if (criteria.endDate && logDate > criteria.endDate) return false;
      
      return true;
    });
  }

  /**
   * Convenient methods for common operations
   */
  async logUserOperation(
    operation: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    context: AuditContext,
    userDetails: Record<string, any>,
    userId?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    return this.log(
      operation,
      'user',
      action,
      context,
      userDetails,
      userId,
      success,
      errorMessage
    );
  }

  async logRoleOperation(
    operation: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    context: AuditContext,
    roleDetails: Record<string, any>,
    roleId?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    return this.log(
      operation,
      'role',
      action,
      context,
      roleDetails,
      roleId,
      success,
      errorMessage
    );
  }

  async logSettingsOperation(
    operation: string,
    action: 'UPDATE',
    context: AuditContext,
    settingsDetails: Record<string, any>,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    return this.log(
      operation,
      'settings',
      action,
      context,
      settingsDetails,
      'system_settings',
      success,
      errorMessage
    );
  }

  async logAuthOperation(
    operation: string,
    context: AuditContext,
    details: Record<string, any> = {},
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    return this.log(
      operation,
      'authentication',
      'READ', // Auth operations are typically reads/validations
      context,
      details,
      null,
      success,
      errorMessage
    );
  }
}

// Global audit logger instance
export const auditLogger = new AuditLogger();

// Helper function to extract audit context from request
export function extractAuditContext(
  request: Request, 
  user?: { id: string; email: string }
): AuditContext {
  // Get client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  let ipAddress = 'unknown';
  if (forwarded) ipAddress = forwarded.split(',')[0].trim();
  else if (realIP) ipAddress = realIP;
  else if (cfConnectingIP) ipAddress = cfConnectingIP;

  return {
    userId: user?.id,
    userEmail: user?.email,
    ipAddress,
    userAgent: request.headers.get('user-agent') || 'unknown',
    sessionId: request.headers.get('x-session-id') || undefined
  };
}

