-- Drop existing user_profiles table if it exists (from previous attempts)
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Create the user_profiles table with the exact fields requested
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role_id UUID REFERENCES public.roles(id) DEFAULT 'd9a0935b-9fe1-4550-8f7e-67639fd0c6f0',
    first_name TEXT,
    last_name TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile TEXT
);

-- Migrate data from existing user_profile table to user_profiles
INSERT INTO public.user_profiles (
    id,
    email,
    role_id,
    first_name,
    last_name,
    is_active,
    last_login,
    created_at,
    updated_at
)
SELECT 
    up.id,
    up.email,
    up.role_id,
    up.first_name,
    up.last_name,
    COALESCE(up.is_active, true),
    up.last_login,
    up.created_at,
    up.updated_at
FROM public.user_profile up
ON CONFLICT (id) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for access control

-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

-- 2. Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() AND r.name = 'admin'
        )
    );

-- 3. Managers can view user and manager profiles (not admin)
CREATE POLICY "Managers can view user profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() AND r.name = 'manager'
        ) AND EXISTS (
            SELECT 1 FROM public.roles r2
            WHERE user_profiles.role_id = r2.id AND r2.name IN ('user', 'manager')
        )
    );

-- 4. Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Users can update their own profile (except role_id)
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id 
        AND role_id = (SELECT role_id FROM public.user_profiles WHERE id = auth.uid())
    );

-- 6. Admins can update any profile including roles
CREATE POLICY "Admins can update any profile" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() AND r.name = 'admin'
        )
    );

-- 7. Managers can update user profiles (not roles)
CREATE POLICY "Managers can update user profiles" ON public.user_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            JOIN public.roles r ON up.role_id = r.id
            WHERE up.id = auth.uid() AND r.name = 'manager'
        ) AND EXISTS (
            SELECT 1 FROM public.roles r2
            WHERE user_profiles.role_id = r2.id AND r2.name = 'user'
        )
    )
    WITH CHECK (
        role_id = (SELECT role_id FROM public.user_profiles WHERE id = user_profiles.id)
    );

-- Create or replace function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    default_role_id UUID;
BEGIN
    -- Get default role (user)
    SELECT id INTO default_role_id
    FROM public.roles 
    WHERE name = 'user' 
    LIMIT 1;

    -- Insert into user_profiles table
    INSERT INTO public.user_profiles (
        id,
        email,
        first_name,
        last_name,
        role_id
    )
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        COALESCE((NEW.raw_user_meta_data->>'role_id')::UUID, default_role_id)
    );
    
    RETURN NEW;
END;
$$;

-- Drop the old trigger and create new one for user_profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at 
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create helper functions for role checking
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles up
        JOIN public.roles r ON up.role_id = r.id
        WHERE up.id = user_id AND r.name = 'admin'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_manager(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles up
        JOIN public.roles r ON up.role_id = r.id
        WHERE up.id = user_id AND r.name IN ('admin', 'manager')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT r.name INTO user_role
    FROM public.user_profiles up
    JOIN public.roles r ON up.role_id = r.id
    WHERE up.id = user_id;
    
    RETURN COALESCE(user_role, 'user');
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_id ON public.user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles(created_at);

-- Add helpful comments
COMMENT ON TABLE public.user_profiles IS 'User profiles with role-based access control';
COMMENT ON COLUMN public.user_profiles.role_id IS 'References roles table for permissions';
COMMENT ON FUNCTION public.is_admin IS 'Check if user has admin role';
COMMENT ON FUNCTION public.is_manager IS 'Check if user has manager or admin role';
COMMENT ON FUNCTION public.get_user_role IS 'Get user role name';
