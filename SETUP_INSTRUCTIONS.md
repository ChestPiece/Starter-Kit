# 🚀 Quick Setup Instructions for Forgot Password

## 🚨 IMMEDIATE ACTION REQUIRED

Your forgot password feature needs Supabase credentials to work. Here's how to fix it:

## Step 1: Get Your Supabase Credentials

### Option A: Use Your Existing Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Log in to your account
3. Select your project
4. Go to **Settings** → **API**
5. Copy these two values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (long string starting with `eyJ...`)

### Option B: Create a New Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Choose your organization
4. Fill in:
   - **Name**: `starter-kit-emails` (or any name)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
5. Click **"Create new project"** (takes ~2 minutes)
6. Once ready, go to **Settings** → **API**
7. Copy the **Project URL** and **anon public** key

## Step 2: Update Your Environment Variables

1. **Open** `.env.local` in your project root
2. **Replace** the placeholder values:

```bash
# Replace these with your actual values
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here
```

3. **Save** the file

## Step 3: Configure Supabase for Emails

1. In your Supabase Dashboard, go to **Authentication** → **Settings**
2. **Site URL**: Set to `http://localhost:3000` (development) or your domain (production)
3. **Redirect URLs**: Add these URLs:
   - `http://localhost:3000/auth/reset-password`
   - `http://localhost:3000/auth/login`
   - `http://localhost:3000/api/auth/confirm`
4. **Email Templates**: (Optional) Customize under **Authentication** → **Email Templates**

## Step 4: Test It

1. **Restart** your development server:

   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

2. **Test the flow**:
   - Go to `http://localhost:3000/auth/login`
   - Click **"Forgot Password"**
   - Enter your **real email address**
   - Click **"Send Reset Link"**
   - Check your **email inbox** (and spam folder)

## 🔧 Troubleshooting

### "Email service not configured" Error

- Your `.env.local` file still has placeholder values
- Make sure you replaced `your-supabase-url-here` with your actual Supabase URL

### Email Not Arriving

1. **Check spam folder**
2. **Wait up to 5 minutes** for delivery
3. **Try a different email** (Gmail, Yahoo, etc.)
4. **Check Supabase logs**: Dashboard → Logs → Auth

### Still Having Issues?

1. **Check browser console** for error messages
2. **Verify environment variables** are loaded:
   - Open browser developer tools
   - Type: `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)`
3. **Test with a different browser**

## 🎯 Expected Behavior After Setup

- ✅ **Clicking "Forgot Password"** shows loading state
- ✅ **Takes 1-3 seconds** to process (not instant)
- ✅ **Shows success message** after sending
- ✅ **Email arrives** within 2-5 minutes
- ✅ **Reset link works** when clicked

## 📧 Production Setup

For production deployment:

1. **Update Site URL** in Supabase to your domain
2. **Add production URLs** to redirect URLs list
3. **Test with multiple email providers**
4. **Consider custom SMTP** for better deliverability (optional)

---

**Need help?** Check the browser console for error messages and ensure all environment variables are properly set.


