# Role-Based Access Control Testing Guide

## Overview
This guide helps you test the role-based access control system and verify that role changes are applied immediately.

## Role Hierarchy & Access Levels

### 👤 **User Role**
- **Sidebar Navigation**: Dashboard only
- **Available Pages**: `/` (Dashboard)
- **Restricted Pages**: `/settings`, `/users`
- **Features**: Basic dashboard view, profile settings via user dropdown

### 👔 **Manager Role** 
- **Sidebar Navigation**: Dashboard + Management section (Settings)
- **Available Pages**: `/`, `/settings` 
- **Restricted Pages**: `/users`
- **Features**: Dashboard stats, settings management, no user management

### 🔑 **Admin Role**
- **Sidebar Navigation**: Dashboard + Administration section (Settings + Users)
- **Available Pages**: `/`, `/settings`, `/users`
- **Restricted Pages**: None
- **Features**: Full system access, user management, all settings

## Testing Steps

### 1. **Initial Login Test**
1. Log in with any role
2. Check the browser console for role detection logs
3. Verify sidebar navigation matches expected items for your role
4. Check the Role Debug component on the dashboard

### 2. **Role Change Test (Real-time)**
1. **Start as User**: Log in as a user - see only Dashboard in sidebar
2. **Admin Changes Role**: Have an admin change your role to "manager" in Supabase
3. **Watch for Changes**: 
   - Console should log: `🎯 ROLE CHANGED! From: user to: manager`
   - Console should log: `👔 MANAGER ACCESS GRANTED - Settings should be visible in 'Management' section`
   - Sidebar should automatically show Settings under "Management"
   - Role Debug component should update to show manager privileges
4. **Test Access**: Click on Settings - should work without page refresh

### 3. **Manager to Admin Test**
1. **Start as Manager**: Should see Dashboard + Settings
2. **Admin Changes Role**: Have role changed to "admin" in Supabase  
3. **Watch for Changes**:
   - Console should log: `🎯 ROLE CHANGED! From: manager to: admin`
   - Console should log: `🔑 ADMIN ACCESS GRANTED - Settings and Users should be visible in 'Administration' section`
   - Sidebar should show both Settings and Users under "Administration"
   - Role Debug component should show full admin privileges
4. **Test Access**: Click on Users - should work without page refresh

### 4. **Manual Refresh Test**
1. If real-time updates don't work, use the "Refresh Role" button in user dropdown
2. Check Role Debug component for updated information
3. Verify console logs show role detection

## Expected Console Logs

### User Role
```
🧭 Navigation updated for role: user
👤 USER ACCESS - Only Dashboard visible
✅ Can access: Dashboard only
❌ Cannot access: Settings, Users
```

### Manager Role  
```
🧭 Navigation updated for role: manager
👔 MANAGER ACCESS GRANTED - Settings should be visible in 'Management' section
✅ Can access: Dashboard, Settings (/settings)
❌ Cannot access: Users (/users)
```

### Admin Role
```
🧭 Navigation updated for role: admin
🔑 ADMIN ACCESS GRANTED - Settings and Users should be visible in 'Administration' section  
✅ Can access: Dashboard, Settings (/settings), Users (/users)
```

### Role Change Detection
```
🔄 User profile changed via real-time subscription: {eventType: "UPDATE", ...}
🎭 Current role before update: user
🎯 ROLE CHANGED! From: user to: manager
🔄 Navigation should update automatically now
```

## Troubleshooting

### Real-time Not Working?
- Check browser console for subscription status: `📡 Real-time subscription status: SUBSCRIBED`
- Use manual refresh button in user dropdown
- Verify Supabase real-time is enabled for your project

### Navigation Not Updating?
- Check console logs for navigation update messages
- Verify role data structure in Role Debug component
- Try manual page refresh as last resort

### Access Denied Errors?
- Check middleware logs for access control messages
- Verify role change was saved in database
- Check that user is logged in properly

## Database Structure

The role system depends on:
- `user_profiles` table with `role_id` field
- `roles` table with role definitions
- Proper foreign key relationship between tables

Make sure your Supabase database has the correct structure and the user's `role_id` is properly updated when changing roles.
