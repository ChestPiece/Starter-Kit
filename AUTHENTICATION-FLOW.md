# SSR Authentication Flow with 2-Attempt Retry

## Overview

The application now implements a robust SSR authentication system with 2-attempt retry logic to ensure reliable user authentication and proper redirections.

## Key Features

### 🔄 2-Attempt Authentication

- **Homepage (app/page.tsx)**: Uses SSR to check authentication with 2 retry attempts
- **Middleware**: Enhanced with 2-attempt retry logic for all route protection
- **Fallback**: If both attempts fail, user is redirected to login

### 🏠 Homepage Logic (`app/page.tsx`)

```typescript
async function verifyUserAuthentication(retries = 2): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!error && user) {
        return true; // Authentication successful
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait before retry
      }
    } catch (error) {
      console.error(`Auth attempt ${attempt} error:`, error);
    }
  }
  return false;
}
```

### 🛡️ Middleware Protection

- **Enhanced**: 2-attempt authentication verification
- **Robust**: Handles network issues and temporary failures
- **Secure**: Proper session validation and role-based access

## Authentication Flow

### 1. User Visits Homepage (/)

```
1. SSR runs verifyUserAuthentication() with 2 attempts
2. If authenticated: redirect to /settings (main app)
3. If not authenticated: redirect to /auth/login
```

### 2. Middleware Protection

```
1. For every route, middleware runs 2-attempt auth check
2. If authenticated: continue to requested route
3. If not authenticated: redirect to /auth/login
4. Handles role-based access control
```

### 3. Retry Logic Benefits

- **Network Issues**: Handles temporary connectivity problems
- **Session Loading**: Allows time for session to be established
- **Reliability**: Reduces false authentication failures
- **User Experience**: Smooth navigation without unnecessary login prompts

## Route Protection

### Public Routes (No Auth Required)

- `/auth/login`
- `/auth/signup`
- `/auth/reset-password`
- `/auth/confirm`
- `/email-confirmation`

### Protected Routes (Auth Required)

- `/settings` - Requires manager/admin role
- `/users` - Requires admin role only
- All other routes - Requires any authenticated user

### Fallback Behavior

- **Authentication Failure**: Redirect to `/auth/login`
- **Access Denied**: Redirect based on role (admin → /users, manager → /settings, user → /)
- **Session Timeout**: Clean logout with redirect to login

## Technical Implementation

### SSR (Server-Side Rendering)

- Uses `@supabase/ssr` for server-side authentication
- Proper cookie handling with `getAll()` and `setAll()`
- No client-side hydration issues

### Client-Side Components

- Separated into `ClientProviders` wrapper
- Proper "use client" boundaries
- No `clientModules` errors

### Security Features

- **CSRF Protection**: Supabase handles CSRF tokens
- **Session Validation**: Multiple layers of validation
- **Role-Based Access**: Granular permission control
- **Automatic Cleanup**: Session cookies cleared on logout

## Benefits

✅ **Reliable Authentication**: 2-attempt retry reduces false failures
✅ **SSR Performance**: Server-side authentication checks
✅ **Better UX**: Smooth redirects without loading states
✅ **Security**: Multiple validation layers
✅ **Maintainable**: Clean separation of concerns
✅ **Scalable**: Handles high traffic with proper caching
