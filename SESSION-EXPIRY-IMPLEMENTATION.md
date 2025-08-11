# Session Expiry Implementation

This document describes the enhanced session expiry functionality that ensures users start as unauthenticated and must verify their credentials.

## Overview

The session expiry system implements multiple layers of security:

1. **Force logout on app start** - Users must authenticate every time they access the application
2. **Inactivity timeout** - Sessions expire after 30 minutes of inactivity
3. **Maximum session duration** - Sessions expire after 24 hours regardless of activity
4. **Session warning** - Users get warned 5 minutes before session expiry
5. **Enhanced middleware validation** - Server-side session validation on every request

## Configuration

Session settings are configured in `lib/session-config.ts`:

```typescript
export const SESSION_CONFIG = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes inactivity timeout
  MAX_SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours maximum duration
  SESSION_WARNING_TIME: 5 * 60 * 1000, // 5 minutes warning before expiry
  SESSION_CHECK_INTERVAL: 60 * 1000, // Check every 60 seconds
  FORCE_LOGOUT_ON_START: false, // Set to false to prevent redirect loops
};
```

### Safe Force Logout Control

To prevent redirect loops, force logout functionality is now controlled via `lib/session-control.ts`:

```typescript
import {
  enableForceLogoutOnStart,
  disableForceLogoutOnStart,
  enableStrictSessionMode,
  disableStrictSessionMode,
} from "@/lib/session-control";

// Enable force logout for next app start (safe way)
enableForceLogoutOnStart();

// Enable strict mode (shorter timeouts + force logout)
enableStrictSessionMode();

// Disable strict mode
disableStrictSessionMode();
```

## Components

### 1. Session Configuration (`lib/session-config.ts`)

- Defines timeout settings and storage keys
- Provides utility functions for session validation
- Handles localStorage management for session tracking

### 2. Enhanced Auth Utils (`lib/auth-utils.ts`)

- `initializeAuth()` - Initializes the authentication system
- `validateUserSession()` - Enhanced session validation with timeout checks
- `setupSessionMonitoring()` - Sets up automatic session monitoring
- `forceLogoutAndRedirect()` - Handles forced logout with session cleanup

### 3. Enhanced Middleware (`middleware.ts`)

- Server-side session validation on every request
- Checks for session expiry by duration and inactivity
- Automatically redirects unauthenticated users to login
- Clears session cookies on logout

### 4. User Context (`components/auth/user-context.tsx`)

- Integrates session expiry checks in user initialization
- Handles session tracking on auth state changes
- Clears session data on logout

### 5. Session Timeout Warning (`components/auth/session-timeout-warning.tsx`)

- Shows warning dialog when session is about to expire
- Allows users to extend session or logout manually
- Displays countdown timer until auto-logout

### 6. Enhanced Login Page (`app/auth/login/page.tsx`)

- Shows specific messages based on logout reason
- Handles different session expiry scenarios
- Provides user-friendly feedback

## Session Flow

### 1. Application Start

```
User accesses app → Middleware checks session → Force logout if configured → Redirect to login
```

### 2. User Login

```
User logs in → Initialize session tracking → Set activity timestamps → Setup monitoring
```

### 3. Session Monitoring

```
Every 60 seconds → Check session validity → Show warning if needed → Auto-logout if expired
```

### 4. User Activity

```
User interaction → Update last activity timestamp → Reset inactivity timer
```

### 5. Session Expiry

```
Timeout reached → Show warning dialog → Allow extension or force logout → Clear session data
```

## Logout Reasons

The system provides specific logout reasons for better user experience:

- `force_logout_on_start` - Forced logout on application start
- `session_timeout` - Session expired due to inactivity
- `inactivity_timeout` - 30 minutes of inactivity
- `max_duration_exceeded` - 24-hour maximum duration reached
- `supabase_session_expired` - Supabase session token expired
- `app_start_logout` - Application start logout
- `invalid_session_on_start` - Invalid session detected on start
- `session_expired_on_start` - Previous session expired
- `user_initiated_logout` - User clicked logout

## Security Features

### 1. Multiple Validation Layers

- Client-side session monitoring
- Server-side middleware validation
- Supabase session validation
- Activity-based timeout tracking

### 2. Session Tracking

- Last activity timestamp
- Session start time
- Warning state tracking
- Automatic cleanup on logout

### 3. Enhanced Protection

- Force logout on app start (configurable)
- Maximum session duration limits
- Automatic cookie cleanup
- Session warning before expiry

## Usage

### Adding to New Pages

The session expiry system works automatically. For new pages:

1. Ensure they're protected by middleware (already configured)
2. The SessionTimeoutWarning component is added globally in layout.tsx
3. User authentication is handled by UserContext

### Customizing Timeout Settings

Modify values in `lib/session-config.ts`:

```typescript
// Example: Change to 15 minutes inactivity timeout
SESSION_TIMEOUT: 15 * 60 * 1000,

// Example: Disable force logout on start
FORCE_LOGOUT_ON_START: false,
```

### Testing Session Expiry

1. Set short timeout values in session-config.ts
2. Login and wait for the timeout period
3. Verify warning dialog appears
4. Test auto-logout functionality

## Integration Points

### Middleware

- Validates sessions on every request
- Redirects unauthenticated users
- Clears session cookies on logout

### UserContext

- Initializes session tracking
- Handles auth state changes
- Manages session cleanup

### Layout

- Includes SessionTimeoutWarning component globally
- Ensures warnings appear throughout the app

## Troubleshooting

### Common Issues

1. **Session not expiring**

   - Check if SESSION_CONFIG values are set correctly
   - Verify setupSessionMonitoring() is called
   - Check browser localStorage for session data

2. **Warning not showing**

   - Ensure SessionTimeoutWarning is in layout.tsx
   - Check if session warning events are being dispatched
   - Verify warning time configuration

3. **Immediate logout**

   - Check if FORCE_LOGOUT_ON_START is enabled
   - Verify session validation logic
   - Check middleware configuration

4. **Redirect loops**
   - Ensure FORCE_LOGOUT_ON_START is set to false in both session-config.ts and middleware.ts
   - Use session-control.ts functions for safe force logout
   - Check that UserContext doesn't call forceLogoutAndRedirect when already on auth pages
   - Verify middleware doesn't redirect to auth pages that are already auth pages

### Debug Logs

The system includes extensive console logging:

- Session validation results
- Auth state changes
- Timeout calculations
- Logout reasons

Check browser console for detailed session information.

## Migration Notes

This implementation:

- ✅ Follows Supabase SSR best practices
- ✅ Uses only `getAll` and `setAll` cookie methods
- ✅ Properly handles session cleanup
- ✅ Provides comprehensive user feedback
- ✅ Supports configurable timeout settings

The system ensures users always start as unauthenticated and must verify their credentials as requested.
