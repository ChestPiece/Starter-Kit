# 🔧 Database Cleanup Instructions

## 🎯 **Goal:** Remove `user_profile` table and keep only `user_profiles` table

Due to network connectivity issues with Supabase CLI, please follow these manual steps:

## 📋 **Step-by-Step Instructions:**

### **1. Open Supabase Dashboard**

- Go to [supabase.com](https://supabase.com)
- Navigate to your project: `pazpinuookneqdplkglv`
- Go to **SQL Editor** in the left sidebar

### **2. Run the Cleanup Script**

- Copy the entire contents of `MANUAL_DATABASE_CLEANUP.sql`
- Paste it into the SQL Editor
- Click **Run** to execute the script

### **3. What the Script Does:**

✅ **Removes** the old `user_profile` table (singular)
✅ **Keeps** the `user_profiles` table (plural) with all your required fields:

- `id`, `email`, `role_id`, `first_name`, `last_name`
- `is_active`, `last_login`, `created_at`, `updated_at`, `profile`
  ✅ **Creates** the trigger to automatically save user data on registration
  ✅ **Sets up** all RLS policies and role-based functions
  ✅ **Ensures** everything works with your existing `roles` table

## 🧪 **Test After Cleanup:**

### **Option 1: Test via Web Interface**

- Go to `http://localhost:3001/test-auth`
- Click "Test Signup & Profile Creation"
- Check that new users are created in `user_profiles` table

### **Option 2: Test via Signup Form**

- Go to `http://localhost:3001/auth/signup`
- Create a test account with first/last name
- Check Supabase dashboard → Authentication → Users
- Check `user_profiles` table has the new user data

## ✅ **Expected Result:**

After running the script, you should have:

- ❌ **No `user_profile` table** (old one removed)
- ✅ **Only `user_profiles` table** (with all your data)
- ✅ **Automatic user creation** when someone signs up
- ✅ **Role assignment** (default 'user' role)
- ✅ **First/last name capture** from signup form
- ✅ **All role-based functions working** (`is_admin()`, `is_manager()`, `get_user_role()`)

## 🚨 **If Something Goes Wrong:**

If you encounter any errors, please:

1. **Share the error message** with me
2. **Check the `roles` table** exists with these UUIDs:
   - Admin: `a0eeb1f4-6b6e-4d1a-b1f7-72e1bb78c8d4`
   - Manager: `e1b0d2c1-79b0-48b4-94fd-60a7bbf2b7c4`
   - User: `d9a0935b-9fe1-4550-8f7e-67639fd0c6f0`

## 💡 **After Cleanup:**

Your database will be clean and organized with:

- **Single source of truth** for user data (`user_profiles` table)
- **Automatic profile creation** on user registration
- **Proper role management** integration
- **All authentication features** working perfectly

Run the script and let me know how it goes! 🚀


