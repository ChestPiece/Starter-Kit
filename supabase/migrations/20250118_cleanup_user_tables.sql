-- Cleanup: Remove old user_profile table and ensure user_profiles table works properly
-- This migration ensures only the user_profiles table exists and functions correctly

-- First, drop any existing triggers that depend on functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS handle_updated_at ON public.user_profile;
DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON public.user_profiles;

-- Then drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

-- Drop the old user_profile table (singular) if it exists
DROP TABLE IF EXISTS public.user_profile CASCADE;

-- Ensure the user_profiles table (plural) exists with the correct structure
-- If it doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role_id UUID REFERENCES public.roles(id) DEFAULT 'd9a0935b-9fe1-4550-8f7e-67639fd0c6f0', -- Default to 'user' role
    first_name TEXT,
    last_name TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile TEXT
);

-- Enable RLS (Row Level Security) on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.user_profiles;

-- Create fresh policies for user_profiles table
CREATE POLICY "Public profiles are viewable by everyone." ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
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
        'd9a0935b-9fe1-4550-8f7e-67639fd0c6f0' -- Default to 'user' role
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- If the profile already exists, just return NEW
        RETURN NEW;
END;
$$;

-- Trigger to automatically create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_profile();

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON public.user_profiles;

-- Trigger for updated_at on user_profiles
CREATE TRIGGER handle_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Recreate role-based access functions to work with user_profiles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid() AND role_id = 'a0eeb1f4-6b6e-4d1a-b1f7-72e1bb78c8d4' -- Admin role ID
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid() AND (role_id = 'e1b0d2c1-79b0-48b4-94fd-60a7bbf2b7c4' OR role_id = 'a0eeb1f4-6b6e-4d1a-b1f7-72e1bb78c8d4') -- Manager or Admin role ID
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role_name text;
BEGIN
  SELECT r.name INTO user_role_name
  FROM public.user_profiles up
  JOIN public.roles r ON up.role_id = r.id
  WHERE up.id = auth.uid();
  RETURN user_role_name;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON public.roles TO anon, authenticated;

-- Comment to document this cleanup
COMMENT ON TABLE public.user_profiles IS 'Main user profiles table - stores user data after registration. Replaces the old user_profile table.';
