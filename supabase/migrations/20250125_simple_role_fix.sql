-- Simple fix for user roles display issue
-- This is a minimal migration that fixes the core problem

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

-- Log the migration
INSERT INTO public.migration_logs (migration_name, status, message)
VALUES ('20250125_simple_role_fix.sql', 'success', 'Simple role fix applied - ensured all users have valid roles.');



