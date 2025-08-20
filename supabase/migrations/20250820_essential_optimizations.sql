-- Essential Supabase Optimizations
-- Simple enhancements to existing tables for better performance
-- No unnecessary complexity, just essential improvements

DO $$ 
BEGIN
    -- Check if the migration has already been executed
    IF NOT EXISTS (
        SELECT 1
        FROM public.migration_logs
        WHERE migration_name = '20250820_essential_optimizations.sql'
        AND status = 'success'
    ) THEN
        
        RAISE NOTICE 'Starting essential optimizations migration...';
        
        -- ==============================================
        -- 1. OPTIMIZE EXISTING USER_PROFILES TABLE
        -- ==============================================
        
        -- Add missing indexes for better query performance (only if they don't exist)
        CREATE INDEX IF NOT EXISTS idx_user_profiles_email_active ON public.user_profiles(email) WHERE is_active = true;
        CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active ON public.user_profiles(role_id) WHERE is_active = true;
        CREATE INDEX IF NOT EXISTS idx_user_profiles_name_search ON public.user_profiles(first_name, last_name) WHERE is_active = true;
        
        -- Improve search performance for user management
        CREATE INDEX IF NOT EXISTS idx_user_profiles_text_search ON public.user_profiles 
        USING gin(to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(email, '')))
        WHERE is_active = true;
        
        -- ==============================================
        -- 2. OPTIMIZE EXISTING ROLES TABLE
        -- ==============================================
        
        -- Ensure roles have proper indexes
        CREATE INDEX IF NOT EXISTS idx_roles_name_unique ON public.roles(name) WHERE name IS NOT NULL;
        
        -- ==============================================
        -- 3. IMPROVE EXISTING FUNCTIONS
        -- ==============================================
        
        -- Optimize the existing get_user_role function for better performance
        CREATE OR REPLACE FUNCTION public.get_user_role()
        RETURNS text
        LANGUAGE plpgsql
        SECURITY DEFINER
        STABLE
        AS $$
        DECLARE
          user_role_name text;
        BEGIN
          -- Use optimized query with proper indexing
          SELECT r.name INTO user_role_name
          FROM public.user_profiles up
          JOIN public.roles r ON up.role_id = r.id
          WHERE up.id = auth.uid() AND up.is_active = true;
          
          RETURN COALESCE(user_role_name, 'user');
        END;
        $$;
        
        -- Optimize the existing is_admin function
        CREATE OR REPLACE FUNCTION public.is_admin()
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        STABLE
        AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1
            FROM public.user_profiles up
            JOIN public.roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() 
            AND up.is_active = true 
            AND r.name = 'admin'
          );
        END;
        $$;
        
        -- Optimize the existing is_manager function
        CREATE OR REPLACE FUNCTION public.is_manager()
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        STABLE
        AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1
            FROM public.user_profiles up
            JOIN public.roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() 
            AND up.is_active = true 
            AND r.name IN ('manager', 'admin')
          );
        END;
        $$;
        
        -- ==============================================
        -- 4. ENHANCE EXISTING TRIGGERS
        -- ==============================================
        
        -- Improve the existing user profile creation trigger for better reliability
        CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER SET search_path = public
        AS $$
        BEGIN
            -- Try to insert with proper error handling
            INSERT INTO public.user_profiles (
                id,
                email,
                first_name,
                last_name,
                role_id,
                is_active
            )
            VALUES (
                NEW.id,
                NEW.email,
                NEW.raw_user_meta_data->>'first_name',
                NEW.raw_user_meta_data->>'last_name',
                'd9a0935b-9fe1-4550-8f7e-67639fd0c6f0', -- Default 'user' role
                true
            );
            RETURN NEW;
        EXCEPTION
            WHEN unique_violation THEN
                -- Profile already exists, update it instead
                UPDATE public.user_profiles 
                SET 
                    email = NEW.email,
                    first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', first_name),
                    last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', last_name),
                    updated_at = NOW()
                WHERE id = NEW.id;
                RETURN NEW;
            WHEN OTHERS THEN
                -- Log error but don't fail the user creation
                RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
                RETURN NEW;
        END;
        $$;
        
        -- ==============================================
        -- 5. OPTIMIZE EXISTING POLICIES
        -- ==============================================
        
        -- Make existing policies more efficient by adding proper conditions
        DROP POLICY IF EXISTS "Users can view own profile and admins can view all" ON public.user_profiles;
        CREATE POLICY "Users can view own profile and admins can view all" ON public.user_profiles
            FOR SELECT USING (
                auth.uid() = id OR 
                EXISTS (
                    SELECT 1 FROM public.user_profiles admin_profile 
                    JOIN public.roles r ON admin_profile.role_id = r.id
                    WHERE admin_profile.id = auth.uid() 
                    AND admin_profile.is_active = true
                    AND r.name = 'admin'
                )
            );
        
        DROP POLICY IF EXISTS "Users can update own profile and admins can update all" ON public.user_profiles;
        CREATE POLICY "Users can update own profile and admins can update all" ON public.user_profiles
            FOR UPDATE USING (
                auth.uid() = id OR 
                EXISTS (
                    SELECT 1 FROM public.user_profiles admin_profile 
                    JOIN public.roles r ON admin_profile.role_id = r.id
                    WHERE admin_profile.id = auth.uid() 
                    AND admin_profile.is_active = true
                    AND r.name = 'admin'
                )
            );
        
        -- ==============================================
        -- 6. PERFORMANCE OPTIMIZATIONS
        -- ==============================================
        
        -- Update table statistics for better query planning
        ANALYZE public.user_profiles;
        ANALYZE public.roles;
        ANALYZE public.role_access;
        
        -- Enable real-time for user_profiles (if not already enabled)
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
        EXCEPTION
            WHEN duplicate_object THEN
                -- Table already in publication, ignore
                NULL;
        END;
        
        -- ==============================================
        -- 7. SIMPLE MAINTENANCE FUNCTION
        -- ==============================================
        
        -- Create a simple function to get user profile with role (optimized)
        CREATE OR REPLACE FUNCTION public.get_user_with_role(profile_user_id UUID)
        RETURNS TABLE (
            id UUID,
            email TEXT,
            role_id UUID,
            role_name TEXT,
            first_name TEXT,
            last_name TEXT,
            is_active BOOLEAN,
            profile TEXT,
            created_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        STABLE
        AS $$
        BEGIN
            RETURN QUERY
            SELECT 
                up.id,
                up.email,
                up.role_id,
                r.name as role_name,
                up.first_name,
                up.last_name,
                up.is_active,
                up.profile,
                up.created_at,
                up.updated_at
            FROM public.user_profiles up
            LEFT JOIN public.roles r ON up.role_id = r.id
            WHERE up.id = profile_user_id
            AND up.is_active = true;
        END;
        $$;
        
        -- Grant execute permission
        GRANT EXECUTE ON FUNCTION public.get_user_with_role(UUID) TO authenticated;
        
        -- Log the successful migration
        INSERT INTO public.migration_logs (migration_name, status, message)
        VALUES ('20250820_essential_optimizations.sql', 'success', 'Essential optimizations applied successfully. Improved indexes, functions, and policies for better performance.');
        
        RAISE NOTICE 'Essential optimizations migration completed successfully!';
        
    ELSE
        RAISE NOTICE 'Migration 20250820_essential_optimizations.sql has already been executed.';
    END IF;
END $$;
