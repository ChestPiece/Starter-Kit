# 🔐 Forgot Password Setup Guide

## ✅ Current Status

Your forgot password functionality is **already implemented and working**! Here's what you have:

### 📋 Components Implemented

1. **ForgotPassword Component** (`components/auth/forgot-password.tsx`)

   - ✅ Email validation
   - ✅ Rate limiting handling
   - ✅ Proper error messages
   - ✅ Security best practices (no email enumeration)

2. **Reset Password Page** (`app/auth/reset-password/page.tsx`)

   - ✅ Token validation
   - ✅ Password strength requirements
   - ✅ Secure password update

3. **Password Reset Implementation** (handled directly in components)
   - ✅ Uses Supabase's built-in functionality via `supabase.auth.resetPasswordForEmail()`
   - ✅ Proper error handling in components

## 🚀 Quick Setup

### 1. Environment Variables

Create a `.env.local` file with your Supabase credentials:

```bash
# Copy the example file
cp env.example .env.local

# Edit with your actual Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. For Local Testing

```bash
# Start Supabase local development
npx supabase start

# Run your Next.js app
npm run dev

# Open email testing interface
# Go to http://localhost:54324 to view sent emails
```

### 3. For Production

In your Supabase Dashboard:

1. Go to **Authentication > Settings**
2. Add your domain to **Site URL**
3. Add these URLs to **Redirect URLs**:
   - `https://yourdomain.com/auth/reset-password`
   - `https://yourdomain.com/auth/login`
   - `https://yourdomain.com/api/auth/confirm`

## 🧪 Testing the Flow

### Local Testing:

1. Go to `http://localhost:3000/auth/login`
2. Click "Forgot Password"
3. Enter any email address
4. Check `http://localhost:54324` for the reset email
5. Click the reset link to test password change

### Production Testing:

1. Go to your login page
2. Click "Forgot Password"
3. Enter a real email address
4. Check your email for the reset link
5. Follow the link to reset your password

## 🔧 How It Works

### Password Reset Flow:

1. User enters email → `ForgotPassword` component
2. Calls `supabase.auth.resetPasswordForEmail()`
3. Supabase sends email with reset link
4. User clicks link → redirected to `/auth/reset-password`
5. Token is exchanged for session
6. User enters new password
7. Password is updated via `supabase.auth.updateUser()`

### Security Features:

- ✅ Rate limiting (1 email per minute)
- ✅ No email enumeration (same response for valid/invalid emails)
- ✅ Secure token handling
- ✅ Password strength validation
- ✅ Automatic session cleanup

## 📧 Email Configuration

Your app uses **Supabase's built-in email system** - no external service needed!

### Local Development:

- Emails are captured by Inbucket
- View at `http://localhost:54324`
- All reset links work locally

### Production:

- Supabase sends real emails
- Uses your configured SMTP or Supabase's service
- Customize templates in Supabase Dashboard

## 🛠️ Troubleshooting

### "Email not sending"

1. **Local**: Check `http://localhost:54324` for captured emails
2. **Production**: Check Supabase Dashboard logs
3. Verify redirect URLs in Supabase settings

### "Rate limited"

- Wait 60 seconds between attempts
- This is a security feature working correctly

### "Link expired/invalid"

- Reset links expire after 1 hour
- Request a new reset if needed
- Check that redirect URLs match your domain

### "Can't reset password"

1. Ensure user account exists
2. Check that email is verified (if required)
3. Verify redirect URLs in Supabase Dashboard

## 🎨 Customization

### Email Templates:

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Customize "Reset Password" template
3. Add your branding and styling

### UI Components:

- Modify `components/auth/forgot-password.tsx` for forgot password form
- Modify `app/auth/reset-password/page.tsx` for reset password page
- All components use your existing design system

## ✅ Production Checklist

- [ ] Environment variables set in production
- [ ] Site URL configured in Supabase Dashboard
- [ ] Redirect URLs added to allowed list
- [ ] Test with real email address
- [ ] Custom email templates configured (optional)
- [ ] Error handling tested

## 🆘 Still Having Issues?

If you're experiencing problems:

1. **Run the test script**: `npx ts-node scripts/test-password-reset.ts`
2. **Check Supabase logs**: Dashboard → Logs
3. **Test locally first**: Use `npx supabase start`
4. **Verify environment variables**: Check your `.env.local`

## 🎉 Conclusion

Your forgot password functionality is already **production-ready**! The implementation follows security best practices and provides a smooth user experience. Just ensure your environment variables are set up correctly and test the flow to verify everything works as expected.
