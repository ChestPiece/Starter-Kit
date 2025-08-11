-- MANUAL DATABASE CLEANUP SCRIPT
-- Run this directly in your Supabase SQL Editor if the migration fails
-- This will clean up the database to only have the user_profiles table

-- Step 1: Drop existing triggers that depend on functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS handle_updated_at ON public.user_profile;
DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON public.user_profiles;

-- Step 2: Drop functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

-- Step 3: Drop the old user_profile table (singular)
DROP TABLE IF EXISTS public.user_profile CASCADE;

-- Step 4: Ensure the user_profiles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
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

-- Step 5: Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.user_profiles;

CREATE POLICY "Public profiles are viewable by everyone." ON public.user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Step 7: Create the trigger function for new user profiles
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
        'd9a0935b-9fe1-4550-8f7e-67639fd0c6f0'
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        RETURN NEW;
END;
$$;

-- Step 8: Create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_profile();

-- Step 9: Create updated_at function and trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

CREATE TRIGGER handle_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Step 10: Create role-based access functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid() AND role_id = 'a0eeb1f4-6b6e-4d1a-b1f7-72e1bb78c8d4'
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
    WHERE id = auth.uid() AND (role_id = 'e1b0d2c1-79b0-48b4-94fd-60a7bbf2b7c4' OR role_id = 'a0eeb1f4-6b6e-4d1a-b1f7-72e1bb78c8d4')
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

-- Step 11: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON public.roles TO anon, authenticated;


