# Supabase Email Setup Guide

This guide helps you configure email functionality using Supabase's built-in email system for password resets and email verification.

## 🚀 Quick Setup (Using Supabase's Built-in Emails)

Your app is already configured to use Supabase's built-in email functionality! No external email service needed.

### For Local Development

When running locally with `supabase start`, emails are automatically handled:

1. **Email Testing Interface**: Open http://localhost:54324 to view emails
2. **All emails are captured**: Password resets, verifications, etc.
3. **Click email links**: They work just like in production

### For Production (Supabase Cloud)

When you deploy to production with Supabase Cloud:

1. **Go to your Supabase Dashboard**
2. **Navigate to Authentication > Settings**
3. **Configure your site URL** (e.g., `https://yourapp.com`)
4. **Add redirect URLs**:
   - `https://yourapp.com/auth/confirm`
   - `https://yourapp.com/auth/reset-password`
   - `https://yourapp.com/auth/login`

## 📧 How It Works

### Password Reset Flow

1. User clicks "Forgot Password"
2. Enters their email address
3. Supabase sends reset email using built-in templates
4. User clicks link in email → redirected to your reset page
5. User enters new password
6. Password is updated in Supabase Auth

### Email Verification Flow

1. User signs up with email/password
2. Supabase sends verification email automatically
3. User clicks verification link → redirected to confirmation page
4. Email is marked as verified in Supabase Auth
5. User can now log in

## 🛠️ Local Development Testing

### View Emails Locally

1. Start Supabase: `supabase start`
2. Open email interface: http://localhost:54324
3. Trigger an email (signup, password reset)
4. Check the email interface to see the email
5. Click links in emails to test the flow

### Test Password Reset

1. Go to http://localhost:3000/auth/login
2. Click "Forgot Password"
3. Enter a test email address
4. Check http://localhost:54324 for the email
5. Click the reset link in the email
6. Set a new password

### Test Email Verification

1. Create a new account at http://localhost:3000/auth/signup
2. Check http://localhost:54324 for verification email
3. Click the verification link
4. Try logging in with the new account

## ⚙️ Configuration

### Environment Variables Required

Only these Supabase variables are needed:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Dashboard Settings

In your Supabase project dashboard:

1. **Authentication > Settings > General**

   - Site URL: `https://yourapp.com` (production) or `http://localhost:3000` (development)

2. **Authentication > URL Configuration**

   - Add redirect URLs for your domains

3. **Authentication > Email Templates** (Optional)
   - Customize the look of your emails
   - Add your branding

## 🚨 Troubleshooting

### Password Reset Not Working

1. **Check Supabase logs**: Go to your project dashboard → Logs
2. **Verify redirect URLs**: Make sure `https://yourapp.com/auth/reset-password` is in your allowed URLs
3. **Check email**: Look in spam folder or use local email interface
4. **Test with different email**: Some email providers block automated emails

### Email Verification Failing

1. **Check confirmation URL**: Should be `https://yourapp.com/api/auth/confirm`
2. **Verify user exists**: Check Authentication > Users in dashboard
3. **Check rate limits**: Supabase limits email sending frequency
4. **Test locally first**: Use http://localhost:54324 to debug

### Common Error Messages

| Error                  | Solution                                       |
| ---------------------- | ---------------------------------------------- |
| "Rate limited"         | Wait 60 seconds between requests               |
| "Invalid redirect URL" | Add URL to Supabase dashboard                  |
| "User not found"       | Check if user exists in Authentication > Users |
| "Email not confirmed"  | User needs to verify email first               |

## 🔧 Advanced Configuration

### Custom Email Templates

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Customize these templates:
   - **Confirm signup**: For email verification
   - **Magic Link**: For passwordless login
   - **Change email address**: For email updates
   - **Reset password**: For password resets

### SMTP Configuration (Optional)

For production, you can configure custom SMTP in `supabase/config.toml`:

```toml
[auth.email.smtp]
host = "smtp.gmail.com"
port = 587
user = "your-email@gmail.com"
pass = "your-app-password"
admin_email = "admin@yourapp.com"
sender_name = "Your App Name"
```

## ✅ Production Checklist

Before deploying:

- [ ] Site URL configured in Supabase dashboard
- [ ] All redirect URLs added to allowed list
- [ ] Test password reset with real email
- [ ] Test signup verification with real email
- [ ] Custom email templates configured (optional)
- [ ] Rate limiting settings appropriate for your app

## 🆘 Support

If you're having issues:

1. Check Supabase project logs
2. Test locally with `supabase start`
3. Verify all URLs in dashboard settings
4. Check the Supabase documentation: https://supabase.com/docs/guides/auth

## 🎯 Benefits of Using Supabase Emails

- ✅ **No external service needed** - Everything works out of the box
- ✅ **Automatic rate limiting** - Built-in protection against spam
- ✅ **Secure by default** - Proper token handling and validation
- ✅ **Easy testing** - Local email interface for development
- ✅ **Customizable** - Email templates can be branded
- ✅ **Reliable** - Backed by Supabase's infrastructure
