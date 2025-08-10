# Supabase Authentication Setup

This document explains how to use the Supabase authentication system that has been set up in your project.

## Overview

Your project now includes a complete Supabase authentication system with:

- Email/password authentication
- Session management
- Route protection
- Login and signup pages
- Auth components and context

## Getting Started

### 1. Environment Setup

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Start Supabase

```bash
# Start Supabase locally
npx supabase start

# Get your local keys
npx supabase status
```

Copy the `API URL` and `anon key` from the status output to your `.env.local` file.

### 3. Database Setup

```bash
# Apply migrations
npm run db:migrate
```

## File Structure

### Core Authentication Files

- `lib/supabase/client.ts` - Browser client for client components
- `lib/supabase/server.ts` - Server client for server components
- `lib/supabase/auth-helpers.ts` - Helper functions for getting user/session
- `middleware.ts` - Route protection and auth token refresh

### Auth Pages

- `app/auth/login/page.tsx` - Login page
- `app/auth/signup/page.tsx` - Signup page
- `app/auth/layout.tsx` - Auth layout wrapper

### Auth Components

- `components/auth/login-form.tsx` - Login form component
- `components/auth/signup-form.tsx` - Signup form component
- `components/auth/logout-button.tsx` - Logout button component
- `components/auth/user-context.tsx` - User context and provider

## Usage Examples

### Getting User in Server Components

```tsx
import { getUser } from "@/lib/supabase/auth-helpers";

export default async function Page() {
  const user = await getUser();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return <div>Hello, {user.email}</div>;
}
```

### Getting User in Client Components

```tsx
"use client";

import { useUser } from "@/components/auth/user-context";

export function MyComponent() {
  const { user, loading } = useUser();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return <div>Hello, {user.email}</div>;
}
```

### Using Logout Button

```tsx
import { LogoutButton } from "@/components/auth/logout-button";

export function Header() {
  return (
    <div>
      <LogoutButton>Sign out</LogoutButton>
    </div>
  );
}
```

## Route Protection

The middleware automatically protects all routes except:

- `/auth/*` - Authentication pages
- Static files and images

Unauthenticated users are redirected to `/auth/login`.

## Configuration

### Supabase Config

Authentication is enabled in `supabase/config.toml`:

```toml
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
enable_signup = true
enable_confirmations = false  # Set to true for email confirmation
```

### Email Confirmations

To enable email confirmations, update `supabase/config.toml`:

```toml
[auth.email]
enable_confirmations = true
```

## Customization

### Styling

Auth components use your existing UI components from `components/ui/`. You can customize:

- Button styles in `components/ui/button.tsx`
- Input styles in `components/ui/input.tsx`
- Layout styling in `app/auth/layout.tsx`

### Adding OAuth Providers

To add OAuth providers (Google, GitHub, etc.), update `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "your_google_client_id"
secret = "env(GOOGLE_CLIENT_SECRET)"
```

## Production Deployment

1. Create a Supabase project at https://supabase.com
2. Update your environment variables with production values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
   ```
3. Push your database schema:
   ```bash
   npx supabase db push
   ```

## Troubleshooting

### Common Issues

1. **"Invalid API key"** - Check your environment variables
2. **Redirect loops** - Ensure auth pages are excluded in middleware
3. **Session not persisting** - Verify middleware is returning the supabaseResponse

### Debugging

Enable debug logging by adding to your environment:

```env
NEXT_PUBLIC_SUPABASE_DEBUG=true
```

## Security Notes

- Never commit your production Supabase keys to git
- Use environment variable substitution in production
- Enable RLS (Row Level Security) policies for your database tables
- Consider enabling email confirmations in production
