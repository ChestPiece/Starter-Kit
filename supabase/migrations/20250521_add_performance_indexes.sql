-- Add performance indexes for better query optimization
-- This migration adds indexes to improve common query patterns

DO $$ 
BEGIN
    -- Check if the migration has already been executed
    IF NOT EXISTS (
        SELECT 1
        FROM public.migration_logs
        WHERE migration_name = '20250521_add_performance_indexes.sql'
        AND status = 'success'
    ) THEN
        
        -- Indexes for user_profiles table
        -- Primary lookups and joins
        CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_role_id ON public.user_profiles(role_id);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_updated_at ON public.user_profiles(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);
        
        -- Search optimization - composite index for name searches
        CREATE INDEX IF NOT EXISTS idx_user_profiles_names ON public.user_profiles(first_name, last_name);
        CREATE INDEX IF NOT EXISTS idx_user_profiles_search ON public.user_profiles USING gin(
            to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, ''))
        );
        
        -- Indexes for roles table
        CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);
        CREATE INDEX IF NOT EXISTS idx_roles_created_at ON public.roles(created_at DESC);
        
        -- Indexes for role_access table
        CREATE INDEX IF NOT EXISTS idx_role_access_role_id ON public.role_access(role_id);
        CREATE INDEX IF NOT EXISTS idx_role_access_resource ON public.role_access(resource);
        CREATE INDEX IF NOT EXISTS idx_role_access_action ON public.role_access(action);
        CREATE INDEX IF NOT EXISTS idx_role_access_composite ON public.role_access(role_id, resource, action);
        
        -- Indexes for settings table (if it exists)
        CREATE INDEX IF NOT EXISTS idx_settings_created_at ON public.settings(created_at DESC) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings');
        CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON public.settings(updated_at DESC) WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings');
        
        -- Indexes for migration_logs
        CREATE INDEX IF NOT EXISTS idx_migration_logs_name ON public.migration_logs(migration_name);
        CREATE INDEX IF NOT EXISTS idx_migration_logs_status ON public.migration_logs(status);
        CREATE INDEX IF NOT EXISTS idx_migration_logs_executed_at ON public.migration_logs(executed_at DESC);
        
        -- Optimize auth.users lookups (if permissions allow)
        -- Note: This might not work due to auth schema restrictions
        -- CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users(email);
        
        -- Log the successful migration
        INSERT INTO public.migration_logs (migration_name, status, message)
        VALUES ('20250521_add_performance_indexes.sql', 'success', 'Performance indexes added successfully.');
        
    END IF;
END $$;
