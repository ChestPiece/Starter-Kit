import { errorLogger } from '@/lib/services/logger';
import { logger } from '@/lib/services/logger';

export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  action: 'retry' | 'redirect' | 'contact_support' | 'wait' | 'none';
  details?: any;
  isRecoverable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuthErrorContext {
  userId?: string;
  email?: string;
  action: string;
  userAgent?: string;
  clientIP?: string;
  timestamp: string;
  sessionId?: string;
}

class AuthErrorHandler {
  private errorCodes: Map<string, Omit<AuthError, 'details'>> = new Map();

  constructor() {
    this.initializeErrorCodes();
  }

  private initializeErrorCodes() {
    // Supabase Auth Error Codes
    this.errorCodes.set('email_not_confirmed', {
      code: 'email_not_confirmed',
      message: 'Email address has not been confirmed',
      userMessage: 'Please check your email and click the confirmation link before signing in.',
      action: 'redirect',
      isRecoverable: true,
      severity: 'medium'
    });

    this.errorCodes.set('invalid_credentials', {
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
      userMessage: 'Incorrect email or password. Please try again.',
      action: 'retry',
      isRecoverable: true,
      severity: 'low'
    });

    this.errorCodes.set('too_many_requests', {
      code: 'too_many_requests',
      message: 'Too many requests',
      userMessage: 'Too many login attempts. Please wait a few minutes before trying again.',
      action: 'wait',
      isRecoverable: true,
      severity: 'medium'
    });

    this.errorCodes.set('signup_disabled', {
      code: 'signup_disabled',
      message: 'Sign up is disabled',
      userMessage: 'Account registration is currently disabled. Please contact support.',
      action: 'contact_support',
      isRecoverable: false,
      severity: 'high'
    });

    this.errorCodes.set('email_address_invalid', {
      code: 'email_address_invalid',
      message: 'Invalid email address format',
      userMessage: 'Please enter a valid email address.',
      action: 'retry',
      isRecoverable: true,
      severity: 'low'
    });

    this.errorCodes.set('password_too_short', {
      code: 'password_too_short',
      message: 'Password is too short',
      userMessage: 'Password must be at least 6 characters long.',
      action: 'retry',
      isRecoverable: true,
      severity: 'low'
    });

    this.errorCodes.set('weak_password', {
      code: 'weak_password',
      message: 'Password does not meet strength requirements',
      userMessage: 'Password must contain uppercase, lowercase, numbers, and special characters.',
      action: 'retry',
      isRecoverable: true,
      severity: 'low'
    });

    this.errorCodes.set('user_already_registered', {
      code: 'user_already_registered',
      message: 'User already registered',
      userMessage: 'An account with this email already exists. Try signing in instead.',
      action: 'redirect',
      isRecoverable: true,
      severity: 'low'
    });

    this.errorCodes.set('session_expired', {
      code: 'session_expired',
      message: 'Session has expired',
      userMessage: 'Your session has expired. Please sign in again.',
      action: 'redirect',
      isRecoverable: true,
      severity: 'medium'
    });

    this.errorCodes.set('invalid_token', {
      code: 'invalid_token',
      message: 'Invalid or expired token',
      userMessage: 'The verification link is invalid or has expired. Please request a new one.',
      action: 'retry',
      isRecoverable: true,
      severity: 'medium'
    });

    this.errorCodes.set('network_error', {
      code: 'network_error',
      message: 'Network connection error',
      userMessage: 'Unable to connect to our servers. Please check your internet connection.',
      action: 'retry',
      isRecoverable: true,
      severity: 'medium'
    });

    this.errorCodes.set('server_error', {
      code: 'server_error',
      message: 'Internal server error',
      userMessage: 'Something went wrong on our end. Please try again in a few minutes.',
      action: 'retry',
      isRecoverable: true,
      severity: 'high'
    });

    this.errorCodes.set('maintenance_mode', {
      code: 'maintenance_mode',
      message: 'Service temporarily unavailable',
      userMessage: 'We are currently performing maintenance. Please try again later.',
      action: 'wait',
      isRecoverable: true,
      severity: 'high'
    });

    // Custom application errors
    this.errorCodes.set('account_suspended', {
      code: 'account_suspended',
      message: 'User account is suspended',
      userMessage: 'Your account has been suspended. Please contact support for assistance.',
      action: 'contact_support',
      isRecoverable: false,
      severity: 'high'
    });

    this.errorCodes.set('account_locked', {
      code: 'account_locked',
      message: 'Account temporarily locked',
      userMessage: 'Account locked due to multiple failed attempts. Try again in 30 minutes.',
      action: 'wait',
      isRecoverable: true,
      severity: 'medium'
    });

    this.errorCodes.set('email_delivery_failed', {
      code: 'email_delivery_failed',
      message: 'Failed to send email',
      userMessage: 'Unable to send confirmation email. Please check your email address and try again.',
      action: 'retry',
      isRecoverable: true,
      severity: 'medium'
    });
  }

  handleError(error: any, context: AuthErrorContext): AuthError {
    const errorCode = this.extractErrorCode(error);
    const knownError = this.errorCodes.get(errorCode);

    let authError: AuthError;

    if (knownError) {
      authError = {
        ...knownError,
        details: this.extractErrorDetails(error)
      };
    } else {
      // Handle unknown errors
      authError = {
        code: 'unknown_error',
        message: error?.message || 'Unknown authentication error',
        userMessage: 'An unexpected error occurred. Please try again.',
        action: 'retry',
        details: { originalError: error },
        isRecoverable: true,
        severity: 'medium'
      };
    }

    // Log the error with context
    this.logError(authError, context);

    // Apply any error transformations based on context
    return this.transformError(authError, context);
  }

  private extractErrorCode(error: any): string {
    if (typeof error === 'string') {
      return this.normalizeErrorCode(error);
    }

    // Supabase error structure
    if (error?.error_description) {
      return this.normalizeErrorCode(error.error_description);
    }

    if (error?.message) {
      return this.normalizeErrorCode(error.message);
    }

    // Check for specific error patterns
    if (error?.status === 422) {
      return 'invalid_credentials';
    }

    if (error?.status === 429) {
      return 'too_many_requests';
    }

    if (error?.status >= 500) {
      return 'server_error';
    }

    // Network errors
    if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
      return 'network_error';
    }

    return 'unknown_error';
  }

  private normalizeErrorCode(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('email not confirmed') || lowerMessage.includes('email_not_confirmed')) {
      return 'email_not_confirmed';
    }

    if (lowerMessage.includes('invalid credentials') || lowerMessage.includes('invalid login')) {
      return 'invalid_credentials';
    }

    if (lowerMessage.includes('too many requests') || lowerMessage.includes('rate limit')) {
      return 'too_many_requests';
    }

    if (lowerMessage.includes('signup disabled') || lowerMessage.includes('registration disabled')) {
      return 'signup_disabled';
    }

    if (lowerMessage.includes('invalid email') || lowerMessage.includes('email address invalid')) {
      return 'email_address_invalid';
    }

    if (lowerMessage.includes('password too short')) {
      return 'password_too_short';
    }

    if (lowerMessage.includes('weak password') || lowerMessage.includes('password strength')) {
      return 'weak_password';
    }

    if (lowerMessage.includes('already registered') || lowerMessage.includes('user exists')) {
      return 'user_already_registered';
    }

    if (lowerMessage.includes('session expired') || lowerMessage.includes('token expired')) {
      return 'session_expired';
    }

    if (lowerMessage.includes('invalid token')) {
      return 'invalid_token';
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return 'network_error';
    }

    return 'unknown_error';
  }

  private extractErrorDetails(error: any): any {
    const details: any = {};

    if (error?.status) details.status = error.status;
    if (error?.statusText) details.statusText = error.statusText;
    if (error?.error) details.error = error.error;
    if (error?.error_description) details.error_description = error.error_description;

    // Extract specific Supabase fields
    if (error?.hint) details.hint = error.hint;
    if (error?.details) details.details = error.details;

    return Object.keys(details).length > 0 ? details : null;
  }

  private logError(error: AuthError, context: AuthErrorContext) {
    const logData = {
      authError: error,
      context,
      severity: error.severity,
      isRecoverable: error.isRecoverable,
    };

    errorLogger.error(new Error(`Auth Error: ${error.code} - ${error.message}`), logData);

    // Additional logging for critical errors
    if (error.severity === 'critical') {
      logger.error('CRITICAL AUTH ERROR:', { logData });
      // Here you could integrate with alerting systems
      // this.sendAlert(error, context);
    }
  }

  private transformError(error: AuthError, context: AuthErrorContext): AuthError {
    // Apply contextual transformations
    
    // If user has been trying for a while, suggest different actions
    if (context.action === 'login' && error.code === 'invalid_credentials') {
      error.userMessage += ' Need help? Try resetting your password.';
    }

    // Customize messages based on time of day, maintenance windows, etc.
    if (this.isMaintenanceWindow()) {
      if (error.severity === 'high') {
        error.userMessage = 'We are currently performing scheduled maintenance. Please try again in a few minutes.';
        error.action = 'wait';
      }
    }

    return error;
  }

  private isMaintenanceWindow(): boolean {
    // Check if current time is within maintenance window
    const now = new Date();
    const hour = now.getUTCHours();
    
    // Example: Maintenance between 2-4 AM UTC
    return hour >= 2 && hour < 4;
  }

  // Helper methods for components
  getRecoveryActions(error: AuthError): Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }> {
    const actions = [];

    switch (error.action) {
      case 'retry':
        actions.push({
          label: 'Try Again',
          action: () => window.location.reload(),
          primary: true
        });
        break;

      case 'redirect':
        if (error.code === 'email_not_confirmed') {
          actions.push({
            label: 'Resend Confirmation',
            action: () => window.location.href = '/auth/resend-confirmation',
            primary: true
          });
        } else if (error.code === 'user_already_registered') {
          actions.push({
            label: 'Sign In Instead',
            action: () => window.location.href = '/auth/login',
            primary: true
          });
        } else {
          actions.push({
            label: 'Go to Login',
            action: () => window.location.href = '/auth/login',
            primary: true
          });
        }
        break;

      case 'contact_support':
        actions.push({
          label: 'Contact Support',
          action: () => window.location.href = 'mailto:support@yourapp.com',
          primary: true
        });
        break;

      case 'wait':
        actions.push({
          label: 'Try Again Later',
          action: () => window.location.reload()
        });
        break;
    }

    // Always provide a way to go back home
    actions.push({
      label: 'Go Home',
      action: () => window.location.href = '/'
    });

    return actions;
  }

  formatErrorForUI(error: AuthError): {
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
    dismissible: boolean;
  } {
    let type: 'error' | 'warning' | 'info' = 'error';
    let dismissible = true;

    if (error.severity === 'low') {
      type = 'warning';
    } else if (error.action === 'wait') {
      type = 'info';
      dismissible = false;
    }

    return {
      title: this.getErrorTitle(error.code),
      message: error.userMessage,
      type,
      dismissible
    };
  }

  private getErrorTitle(code: string): string {
    const titles: Record<string, string> = {
      'email_not_confirmed': 'Email Confirmation Required',
      'invalid_credentials': 'Sign In Failed',
      'too_many_requests': 'Too Many Attempts',
      'signup_disabled': 'Registration Unavailable',
      'email_address_invalid': 'Invalid Email',
      'password_too_short': 'Password Too Short',
      'weak_password': 'Weak Password',
      'user_already_registered': 'Account Already Exists',
      'session_expired': 'Session Expired',
      'invalid_token': 'Invalid Link',
      'network_error': 'Connection Error',
      'server_error': 'Server Error',
      'maintenance_mode': 'Maintenance',
      'account_suspended': 'Account Suspended',
      'account_locked': 'Account Locked',
      'email_delivery_failed': 'Email Delivery Failed'
    };

    return titles[code] || 'Authentication Error';
  }
}

// Export singleton instance
export const authErrorHandler = new AuthErrorHandler();

// React hook for using auth error handler
export function useAuthErrorHandler() {
  const handleAuthError = (error: any, context: Partial<AuthErrorContext> = {}) => {
    const fullContext: AuthErrorContext = {
      action: 'unknown',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      ...context
    };

    return authErrorHandler.handleError(error, fullContext);
  };

  return {
    handleAuthError,
    getRecoveryActions: authErrorHandler.getRecoveryActions.bind(authErrorHandler),
    formatErrorForUI: authErrorHandler.formatErrorForUI.bind(authErrorHandler)
  };
}
