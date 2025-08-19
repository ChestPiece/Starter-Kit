# Priority 3 Enhancements - Usage Guide

This document demonstrates how to use the implemented Priority 3 enhancements in your application.

## 1. Database Migration Validation

### Command Usage

```bash
# Validate all migrations
npm run db:validate

# Check rollback safety for all migrations
npm run db:rollback-check

# Check rollback safety for specific migration
npm run db:rollback-check 20250116_create_user_profiles_table.sql

# Safe migration (validates before running)
npm run db:safe-migrate
```

### Example Output

```
🔍 Starting migration validation...

# Migration Validation Report

**Status:** ✅ VALID
**Migrations Found:** 10

## ⚠️ Warnings
- 20250116_create_user_profiles_table.sql contains irreversible operations without explicit transaction

## 📋 Migration Summary
- ✅ **20250116_create_user_profiles_table.sql** (NO-TX) - create_user_profiles_table
- ✅ **20250117_cleanup_user_tables.sql** (TX) - cleanup_user_tables
```

### Programmatic Usage

```typescript
import {
  MigrationValidator,
  RollbackAnalyzer,
} from "./scripts/validate-migrations";

// Validate migrations
const validator = new MigrationValidator();
const validation = await validator.validateMigrations();

if (!validation.isValid) {
  console.error("Migration validation failed:", validation.errors);
}

// Check rollback safety
const analyzer = new RollbackAnalyzer();
const rollbackReport = await analyzer.generateRollbackReport();
console.log(rollbackReport);
```

## 2. API Request/Response Logging

### Automatic Logging (Applied to GraphQL endpoint)

```typescript
// Already applied to /api/graphql route
// Logs include:
// - Request ID, method, URL, headers
// - Request/response body (sanitized)
// - Duration, status codes
// - Client IP, user agent
// - Error details

// Example log output:
📤 API REQUEST {
  id: '1703234567890-abc123def',
  method: 'POST',
  url: '/api/graphql',
  ip: '127.0.0.1'
}
📥 API RESPONSE {
  id: '1703234567890-abc123def',
  status: 200,
  duration: '42ms'
}
```

### Apply to Your API Routes

```typescript
import {
  developmentLogger,
  productionLogger,
} from "@/lib/middleware/api-logger";

// For development (detailed logging)
const loggedHandler = developmentLogger(async (req: NextRequest) => {
  // Your API logic here
  return NextResponse.json({ success: true });
});

// For production (basic logging, external services)
const prodHandler = productionLogger(async (req: NextRequest) => {
  // Your API logic here
  return NextResponse.json({ success: true });
});

export { loggedHandler as POST };
```

### Configuration Options

```typescript
import { createApiLogger } from "@/lib/middleware/api-logger";

const customLogger = createApiLogger({
  enabled: true,
  logLevel: "detailed", // 'basic' | 'detailed' | 'full'
  excludeRoutes: ["/api/health"],
  maskSensitiveData: true,
  logToFile: true,
  logToExternal: true,
});
```

## 3. Enhanced Auth Error Handling

### Basic Usage in Components

```typescript
import { useAuthErrorHandler } from "@/lib/auth/error-handler";

function LoginForm() {
  const { handleAuthError, formatErrorForUI, getRecoveryActions } =
    useAuthErrorHandler();

  const handleLogin = async () => {
    try {
      // Your auth logic
      await supabase.auth.signInWithPassword({ email, password });
    } catch (error) {
      const authError = handleAuthError(error, {
        action: "login",
        email: email,
      });

      // Format for UI display
      const uiError = formatErrorForUI(authError);
      setError(uiError);

      // Get recovery actions
      const actions = getRecoveryActions(authError);
      setRecoveryActions(actions);
    }
  };
}
```

### Enhanced Auth Form Component

```typescript
import { EnhancedAuthForm } from '@/components/auth/enhanced-auth-form';

function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <EnhancedAuthForm
      mode={mode}
      onModeChange={setMode}
      onSuccess={() => router.push('/dashboard')}
    />
  );
}
```

### Error Types and Recovery Actions

- **email_not_confirmed**: Shows resend confirmation button
- **invalid_credentials**: Suggests password reset
- **too_many_requests**: Shows wait time
- **user_already_registered**: Redirects to login
- **weak_password**: Shows password requirements
- **network_error**: Retry button with connection tips

## 4. CSRF Protection

### Environment Setup

```bash
# Add to your .env.local
CSRF_SECRET=your-super-secret-csrf-key-here-change-this
```

### Apply to API Routes

```typescript
import { withCSRFProtection } from "@/lib/security/csrf-protection";

const protectedHandler = withCSRFProtection(async (request: NextRequest) => {
  // Your protected API logic here
  return NextResponse.json({ success: true });
});

export { protectedHandler as POST };
```

### Server-Side Token Generation

```typescript
import { getCSRFToken, setCSRFToken } from '@/lib/security/csrf-protection';
import { CSRFToken } from '@/components/ui/csrf-token';

export default async function Page() {
  const token = await setCSRFToken(); // Sets cookie and returns token

  return (
    <div>
      <CSRFToken token={token} />
      {/* Your page content */}
    </div>
  );
}
```

### Protected Forms

```typescript
import { ProtectedForm, useCSRFProtection } from '@/components/ui/csrf-token';

function MyForm() {
  return (
    <ProtectedForm onSubmit={handleSubmit}>
      {/* CSRF token automatically included */}
      <input name="email" type="email" />
      <button type="submit">Submit</button>
    </ProtectedForm>
  );
}
```

### Protected Fetch Requests

```typescript
import { useCSRFProtection } from "@/components/ui/csrf-token";

function MyComponent() {
  const { protectedFetch } = useCSRFProtection();

  const handleApiCall = async () => {
    // CSRF token automatically added to headers
    const response = await protectedFetch("/api/protected-endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "example" }),
    });
  };
}
```

### Custom Fetch with CSRF

```typescript
import { createProtectedFetch } from "@/lib/security/csrf-protection";

const fetch = createProtectedFetch();

// Use like normal fetch, CSRF protection applied automatically
const response = await fetch("/api/endpoint", {
  method: "POST",
  body: JSON.stringify({ data: "example" }),
});
```

## Configuration Examples

### Environment Variables

```bash
# .env.local

# CSRF Protection
CSRF_SECRET=your-csrf-secret-key-change-in-production

# API Logging
API_LOGGING=true
EXTERNAL_LOGGING_ENDPOINT=https://your-logging-service.com/api/logs
LOGGING_SERVICE_TOKEN=your-logging-service-token

# Migration Validation
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Production Deployment Checklist

- [ ] Set strong CSRF_SECRET
- [ ] Configure external logging service
- [ ] Set up migration validation in CI/CD
- [ ] Enable production error logging
- [ ] Test auth error flows
- [ ] Verify CSRF protection on all forms

## Integration Examples

### Complete Protected API Route

```typescript
// app/api/protected/route.ts
import { withCSRFProtection } from "@/lib/security/csrf-protection";
import { developmentLogger } from "@/lib/middleware/api-logger";
import { rateLimiter, rateLimitConfigs } from "@/lib/utils/rate-limiter";
import { authErrorHandler } from "@/lib/auth/error-handler";

const handler = developmentLogger(
  withCSRFProtection(async (request: NextRequest) => {
    try {
      // Rate limiting
      const clientIP = getClientIP(request);
      if (rateLimiter.isRateLimited(clientIP, rateLimitConfigs.api)) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429 }
        );
      }

      // Your business logic here
      return NextResponse.json({ success: true });
    } catch (error) {
      const authError = authErrorHandler.handleError(error, {
        action: "api_call",
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: authError.userMessage },
        { status: 500 }
      );
    }
  })
);

export { handler as POST };
```

This implementation provides enterprise-level security, monitoring, and error handling for your application!
