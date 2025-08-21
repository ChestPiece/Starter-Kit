-- Direct SQL to fix user roles display issue
-- Copy and paste this into your Supabase SQL Editor

-- 1. Update any users with NULL role_id to default 'user' role
UPDATE public.user_profiles 
SET role_id = 'd9a0935b-9fe1-4550-8f7e-67639fd0c6f0'  -- Default 'user' role
WHERE role_id IS NULL;

-- 2. Ensure role_id has a default value for new users
ALTER TABLE public.user_profiles 
ALTER COLUMN role_id SET DEFAULT 'd9a0935b-9fe1-4550-8f7e-67639fd0c6f0';

-- 3. Add helpful indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active 
ON public.user_profiles(role_id, is_active) 
WHERE is_active = true;

-- 4. Update table statistics
ANALYZE public.user_profiles;
ANALYZE public.roles;

-- Check the results
SELECT 
    up.id,
    up.email,
    up.first_name,
    up.last_name,
    COALESCE(r.name, 'user') as role_name,
    up.is_active
FROM public.user_profiles up
LEFT JOIN public.roles r ON up.role_id = r.id
ORDER BY up.created_at DESC
LIMIT 10;



