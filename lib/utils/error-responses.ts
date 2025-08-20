/**
 * Standardized error response utilities for better client-side debugging
 */

export interface ApiError {
  error: string;
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  suggestion?: string;
  documentation?: string;
}

export interface ErrorContext {
  requestId?: string;
  endpoint?: string;
  method?: string;
  userId?: string;
}

class ErrorResponseBuilder {
  /**
   * Create a standardized error response
   */
  createError(
    error: string,
    code: string,
    message: string,
    httpStatus: number = 400,
    context: ErrorContext = {},
    details?: Record<string, any>,
    suggestion?: string
  ): { response: Response; error: ApiError } {
    const apiError: ApiError = {
      error,
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      suggestion,
      documentation: this.getDocumentationLink(code)
    };

    const response = new Response(JSON.stringify(apiError), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        ...(context.requestId && { 'X-Request-ID': context.requestId })
      }
    });

    return { response, error: apiError };
  }

  /**
   * Authentication related errors
   */
  authenticationError(
    code: string,
    message: string,
    context: ErrorContext = {},
    details?: Record<string, any>
  ) {
    const suggestions: Record<string, string> = {
      'AUTH_MISSING_TOKENS': 'Ensure both access_token and refresh_token are provided in the request body.',
      'AUTH_INVALID_TOKEN': 'Check that your authentication tokens are valid and not expired.',
      'AUTH_SESSION_EXPIRED': 'Please log in again to obtain fresh authentication tokens.',
      'AUTH_RATE_LIMITED': 'Wait for the specified time before attempting authentication again.',
      'AUTH_CONFIRMATION_FAILED': 'Verify that the confirmation link is valid and not expired.'
    };

    return this.createError(
      'Authentication Error',
      code,
      message,
      code === 'AUTH_RATE_LIMITED' ? 429 : 401,
      context,
      details,
      suggestions[code]
    );
  }

  /**
   * Validation related errors
   */
  validationError(
    code: string,
    message: string,
    context: ErrorContext = {},
    details?: Record<string, any>
  ) {
    const suggestions: Record<string, string> = {
      'VALIDATION_MISSING_FIELD': 'Check that all required fields are included in your request.',
      'VALIDATION_INVALID_EMAIL': 'Ensure the email address follows the correct format (example@domain.com).',
      'VALIDATION_INVALID_URL': 'Verify that the URL is properly formatted and uses HTTP or HTTPS protocol.',
      'VALIDATION_CONTENT_TYPE': 'Check that the request content type is supported.',
      'VALIDATION_FILE_SIZE': 'Reduce the file size to meet the maximum allowed limit.'
    };

    return this.createError(
      'Validation Error',
      code,
      message,
      400,
      context,
      details,
      suggestions[code]
    );
  }

  /**
   * Rate limiting errors
   */
  rateLimitError(
    code: string,
    message: string,
    retryAfter: number,
    remaining: number,
    context: ErrorContext = {}
  ) {
    return this.createError(
      'Rate Limit Exceeded',
      code,
      message,
      429,
      context,
      {
        retryAfter,
        remaining,
        resetTime: Date.now() + (retryAfter * 1000)
      },
      `Please wait ${retryAfter} seconds before making another request. You have ${remaining} requests remaining.`
    );
  }

  /**
   * Security related errors
   */
  securityError(
    code: string,
    message: string,
    context: ErrorContext = {},
    details?: Record<string, any>
  ) {
    const suggestions: Record<string, string> = {
      'SECURITY_INVALID_URL': 'Ensure the URL does not contain dangerous characters or protocols.',
      'SECURITY_CONTENT_BLOCKED': 'The content type or file format is not allowed for security reasons.',
      'SECURITY_FILE_REJECTED': 'The file appears to contain potentially harmful content.',
      'SECURITY_DOMAIN_BLOCKED': 'The requested domain is not in the allowed list.',
      'SECURITY_INJECTION_DETECTED': 'The content contains potentially dangerous scripts or code.'
    };

    return this.createError(
      'Security Error',
      code,
      message,
      403,
      context,
      details,
      suggestions[code]
    );
  }

  /**
   * External service errors
   */
  externalServiceError(
    code: string,
    message: string,
    context: ErrorContext = {},
    details?: Record<string, any>
  ) {
    const suggestions: Record<string, string> = {
      'EXTERNAL_TIMEOUT': 'The external service took too long to respond. Try again later.',
      'EXTERNAL_UNAVAILABLE': 'The external service is currently unavailable. Please try again later.',
      'EXTERNAL_INVALID_RESPONSE': 'The external service returned an unexpected response format.',
      'EXTERNAL_AUTHENTICATION_FAILED': 'Failed to authenticate with the external service.'
    };

    return this.createError(
      'External Service Error',
      code,
      message,
      502,
      context,
      details,
      suggestions[code]
    );
  }

  /**
   * GraphQL specific errors
   */
  graphqlError(
    code: string,
    message: string,
    context: ErrorContext = {},
    details?: Record<string, any>
  ) {
    const suggestions: Record<string, string> = {
      'GRAPHQL_QUERY_REQUIRED': 'Include a valid GraphQL query in the request body.',
      'GRAPHQL_SYNTAX_ERROR': 'Check your GraphQL query syntax for errors.',
      'GRAPHQL_EXECUTION_FAILED': 'The GraphQL operation failed. Check the query and variables.',
      'GRAPHQL_UNAUTHORIZED': 'Ensure you are authenticated before making GraphQL requests.'
    };

    return this.createError(
      'GraphQL Error',
      code,
      message,
      400,
      context,
      details,
      suggestions[code]
    );
  }

  /**
   * Server errors
   */
  serverError(
    code: string,
    message: string,
    context: ErrorContext = {},
    details?: Record<string, any>
  ) {
    return this.createError(
      'Server Error',
      code,
      message,
      500,
      context,
      details,
      'This is an internal server error. Please try again later or contact support if the problem persists.'
    );
  }

  /**
   * Get documentation link for error code
   */
  private getDocumentationLink(code: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_DOCS_URL || '/docs';
    return `${baseUrl}/errors#${code.toLowerCase()}`;
  }
}

// Global error response builder
export const errorResponse = new ErrorResponseBuilder();

// Convenience functions for common error types
export const createAuthError = errorResponse.authenticationError.bind(errorResponse);
export const createValidationError = errorResponse.validationError.bind(errorResponse);
export const createRateLimitError = errorResponse.rateLimitError.bind(errorResponse);
export const createSecurityError = errorResponse.securityError.bind(errorResponse);
export const createExternalError = errorResponse.externalServiceError.bind(errorResponse);
export const createGraphQLError = errorResponse.graphqlError.bind(errorResponse);
export const createServerError = errorResponse.serverError.bind(errorResponse);

// Helper to extract request ID from headers
export function getRequestId(request: Request): string | undefined {
  return request.headers.get('x-request-id') || undefined;
}

