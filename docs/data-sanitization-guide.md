# Data Sanitization Guide

This guide outlines the data sanitization measures implemented to prevent sensitive information from being exposed in application logs.

## Overview

Data sanitization is crucial for maintaining security and privacy in application logs. This implementation provides utilities and patterns to ensure sensitive data is properly masked or transformed before logging.

## Sanitization Utilities

### Location
`lib/utils/data-sanitizer.ts`

### Available Functions

#### Email Sanitization
```typescript
sanitizeEmail(email: string): string
```
- Masks email addresses showing only the domain
- Example: `user@example.com` → `***@example.com`

#### Tab ID Sanitization
```typescript
sanitizeTabId(tabId: string): string
```
- Masks tab IDs showing only first and last 4 characters
- Example: `abc123def456ghi789` → `abc1...i789`

#### URL Sanitization
```typescript
sanitizeUrl(url: string): string
```
- Masks URL paths and query parameters
- Example: `https://api.example.com/users/123?token=abc` → `https://api.example.com/***`

#### API Key Sanitization
```typescript
sanitizeApiKey(apiKey: string): string
```
- Masks API keys showing only first and last 4 characters
- Example: `sk_live_abc123def456` → `sk_l...f456`

### Context Creation Functions

#### Tab Context
```typescript
createTabContext(tabId: string): Record<string, any>
```
Creates a sanitized context object for tab-related logging:
```typescript
{
  tabIdHash: "abc1...i789",
  tabType: "browser-tab"
}
```

#### Email Context
```typescript
createEmailContext(email: string): Record<string, any>
```
Creates a sanitized context object for email-related logging:
```typescript
{
  emailDomain: "example.com",
  emailType: "user-email"
}
```

#### URL Context
```typescript
createUrlContext(url: string): Record<string, any>
```
Creates a sanitized context object for URL-related logging:
```typescript
{
  protocol: "https:",
  hostname: "api.example.com",
  hasPath: true,
  hasQuery: true
}
```

## Implementation Examples

### Before (Unsafe)
```typescript
// ❌ Exposes sensitive data
logger.info(`Password reset sent to ${email}`);
logger.info(`Tab ${tabId} authenticated`);
logger.info(`API call to ${fullUrl}`);
```

### After (Safe)
```typescript
// ✅ Uses sanitized logging
logger.info('Password reset sent successfully', createEmailContext(email));
logger.info('Tab authenticated', createTabContext(tabId));
logger.info('API call completed', createUrlContext(fullUrl));
```

## Files Updated

The following files have been updated to use sanitized logging:

1. **`lib/auth/tab-isolation.ts`**
   - Tab ID sanitization for authentication events
   - Tab isolation logging

2. **`components/auth/user-context.tsx`**
   - Auth event logging with sanitized tab IDs
   - User sign-out events

3. **`components/auth/forgot-password.tsx`**
   - Email sanitization for password reset events
   - URL sanitization for redirect URLs

4. **`components/login-form.tsx`**
   - Tab authentication logging

5. **`scripts/test-auth-flow.ts`**
   - Supabase URL sanitization
   - API key status logging
   - Configuration check logging

## Logging Service Integration

The existing logging service (`lib/services/logger.ts`) already includes:

- Sensitive key detection and masking
- Configurable sanitization rules
- Context-based logging support

The data sanitizer utilities complement these features by providing:

- Specific sanitization functions for common data types
- Consistent context creation patterns
- Easy-to-use helper functions

## Best Practices

### 1. Always Use Context Objects
```typescript
// ✅ Good
logger.info('User action completed', { 
  action: 'login',
  userDomain: email.split('@')[1],
  timestamp: Date.now()
});

// ❌ Avoid
logger.info(`User ${email} logged in at ${timestamp}`);
```

### 2. Sanitize Before Logging
```typescript
// ✅ Good
const sanitizedContext = sanitizeForLogging({
  email: userEmail,
  apiKey: apiToken,
  url: requestUrl
});
logger.info('Operation completed', sanitizedContext);
```

### 3. Use Specific Context Creators
```typescript
// ✅ Good - specific and consistent
logger.info('Email sent', createEmailContext(email));
logger.info('Tab created', createTabContext(tabId));
logger.info('API called', createUrlContext(url));
```

### 4. Avoid String Interpolation
```typescript
// ❌ Avoid - can expose sensitive data
logger.info(`Processing ${sensitiveData}`);

// ✅ Good - structured and safe
logger.info('Processing data', { dataType: 'user-info', recordCount: count });
```

## Security Considerations

1. **Default to Sanitization**: When in doubt, sanitize the data
2. **Review Log Outputs**: Regularly review log outputs to ensure no sensitive data is exposed
3. **Environment-Specific Rules**: Consider different sanitization rules for development vs. production
4. **Audit Trail**: Maintain enough information for debugging while protecting sensitive data

## Configuration

The sanitization behavior can be configured through the `SanitizationConfig` interface:

```typescript
const config: SanitizationConfig = {
  maskEmail: true,     // Mask email addresses
  maskTabId: true,     // Mask tab IDs
  maskUrl: true,       // Mask URLs
  maskApiKey: true,    // Mask API keys
};
```

## Testing

To verify sanitization is working:

1. Check log outputs in development
2. Ensure no sensitive data appears in plain text
3. Verify context objects contain useful but safe information
4. Test with various data types and edge cases

## Future Enhancements

- Add sanitization for additional data types (phone numbers, SSNs, etc.)
- Implement configurable sanitization levels
- Add automated testing for sanitization functions
- Consider integration with external log analysis tools