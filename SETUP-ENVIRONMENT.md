# Environment Setup Instructions

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration (REQUIRED)
# Get these from your Supabase project dashboard at https://app.supabase.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Application Theme Configuration
THEME_SITE_NAME="Kaizen CMA"
THEME_FAV_ICON="/favicon.ico"

# Optional: Email Service Configuration
# Choose one of these email services:

# Option 1: Resend (recommended for production)
# RESEND_API_KEY=re_your-resend-api-key-here

# Option 2: Nodemailer with Gmail (for development)
# NODEMAILER_EMAIL=your-email@gmail.com
# NODEMAILER_PASSWORD=your-app-password-here
```

## Setup Steps

1. **Create Supabase Project**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create a new project
   - Copy the Project URL and anon key from Settings > API

2. **Setup Database**
   ```bash
   npm run supabase:init
   npm run supabase:link
   npm run db:migrate
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Important Notes

- **Never commit `.env.local` to your repository**
- The app will not work without proper Supabase credentials
- Database migrations must be run after linking to your Supabase project
- Role-based authentication requires the user_profiles table to be set up correctly

## Troubleshooting

If you encounter build errors:
1. Ensure all environment variables are set correctly
2. Verify your Supabase project is properly configured
3. Check that database migrations have been applied
4. Run `npm run build` to test for any compilation errors
