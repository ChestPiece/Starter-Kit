# Environment Setup Guide

This guide helps you set up all required environment variables for the Starter Kit 2.0 application.

## Quick Setup

1. **Copy the template**

   ```bash
   cp .env.example .env.local
   ```

2. **Fill in required variables** (see sections below)

3. **Start the development server**
   ```bash
   npm run dev
   ```

The application will validate your environment variables on startup and show helpful error messages if anything is missing.

## Required Variables

### Supabase Configuration

Get these from your [Supabase Dashboard](https://app.supabase.com) → Project Settings → API:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**How to find these:**

1. Go to your Supabase project dashboard
2. Click "Settings" in the sidebar
3. Go to "API" section
4. Copy the URL and anon/public key

### Security Configuration

```bash
CSRF_SECRET=your-strong-random-secret
```

**Generate a strong secret:**

```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online generator
# Visit: https://generate-secret.vercel.app/32
```

## Optional Variables

### Application Settings

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Your site URL
NEXT_PUBLIC_SITE_NAME=Starter Kit 2.0      # Your app name
NEXT_PUBLIC_LOGO_URL=                       # Your logo URL
NEXT_PUBLIC_LOGO_SETTING=                   # Logo setting preference
```

### WhatsApp Integration

For WhatsApp messaging features:

```bash
ULTRAMSG_INSTANCE_ID=your_instance_id
ULTRAMSG_TOKEN=your_token
```

**How to get these:**

1. Sign up at [UltraMsg](https://ultramsg.com/)
2. Create an instance
3. Copy the Instance ID and Token

### Development & Debugging

```bash
NEXT_PUBLIC_SUPABASE_DEBUG=false  # Enable Supabase debug logs
API_LOGGING=true                   # Enable API request logging
```

### External Services (Optional)

```bash
EXTERNAL_LOGGING_ENDPOINT=        # External logging service URL
LOGGING_SERVICE_TOKEN=            # Token for logging service
SUPABASE_SERVICE_ROLE_KEY=        # Service role key (for migrations)
```

## Environment Validation

The application automatically validates your environment variables:

- ✅ **Valid**: All required variables are set correctly
- ⚠️ **Warnings**: Optional improvements suggested
- ❌ **Errors**: Missing required variables (app won't work)

### Common Validation Messages

| Message                                                           | Solution                         |
| ----------------------------------------------------------------- | -------------------------------- |
| `Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL` | Add your Supabase project URL    |
| `CSRF_SECRET is using default value`                              | Set a strong random secret       |
| `Invalid NEXT_PUBLIC_SUPABASE_URL`                                | Ensure it's a valid Supabase URL |
| `CSRF_SECRET should be at least 32 characters`                    | Use a longer secret              |

## Production Setup

### Required for Production

1. **Strong CSRF Secret**

   ```bash
   CSRF_SECRET=your-production-strong-secret
   ```

2. **Production Site URL**

   ```bash
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   ```

3. **Supabase Production Keys**
   - Use your production Supabase project
   - Never use development keys in production

### Security Checklist

- [ ] Set strong `CSRF_SECRET` (32+ characters)
- [ ] Use production Supabase URL and keys
- [ ] Set correct `NEXT_PUBLIC_SITE_URL`
- [ ] Never commit `.env.local` to git
- [ ] Use environment variables in deployment platform
- [ ] Enable Row Level Security (RLS) in Supabase

## Deployment Platforms

### Vercel

1. Go to your project settings in Vercel
2. Add environment variables in "Environment Variables" section
3. Redeploy your application

### Other Platforms

Most platforms have environment variable management:

- **Netlify**: Site settings → Environment variables
- **Railway**: Project → Variables
- **Heroku**: Settings → Config Vars

## Troubleshooting

### Common Issues

**"Missing required environment variable"**

- Copy `.env.example` to `.env.local`
- Fill in the required values
- Restart your development server

**"Invalid Supabase URL"**

- Check the URL format: `https://xxx.supabase.co`
- Ensure it's from your project settings

**"CSRF token errors"**

- Set a strong `CSRF_SECRET`
- Ensure it's the same across all instances

**"Redirect loops on auth"**

- Check `NEXT_PUBLIC_SITE_URL` is correct
- Verify Supabase auth settings match

### Getting Help

1. Check the console for validation messages
2. Enable debug mode: `NEXT_PUBLIC_SUPABASE_DEBUG=true`
3. Review this documentation
4. Check the main [README.md](../README.md)

## Example .env.local

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
CSRF_SECRET=base64-encoded-32-byte-secret-here

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=My Awesome App
ULTRAMSG_INSTANCE_ID=instance_12345
ULTRAMSG_TOKEN=token_abcdef123456
```

---

**Need help?** Check the [authentication setup guide](./authentication-setup.md) or the main [README.md](../README.md).
