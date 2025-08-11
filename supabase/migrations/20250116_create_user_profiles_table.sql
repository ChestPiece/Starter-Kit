-- Update existing user_profile table to include missing columns
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.user_profile ADD COLUMN IF NOT EXISTS profile TEXT;

-- RLS is already enabled on user_profile table
-- Add missing policies if they don't exist
DO $$ 
BEGIN
    -- Check if the policies already exist before creating them
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profile' 
        AND policyname = 'Users can insert their own profile.'
    ) THEN
        CREATE POLICY "Users can insert their own profile." ON public.user_profile
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profile' 
        AND policyname = 'Users can update own profile.'
    ) THEN
        CREATE POLICY "Users can update own profile." ON public.user_profile
            FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- Create function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.user_profile (
        id,
        first_name,
        last_name,
        full_name,
        email,
        avatar_url
    )
    values (
        new.id,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.raw_user_meta_data->>'full_name',
        new.email,
        new.raw_user_meta_data->>'avatar_url'
    );
    return new;
end;
$$;

-- Create trigger to automatically create profile on user signup
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Create function to handle updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

-- Create trigger for updated_at (check if it exists first)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'handle_updated_at' 
        AND tgrelid = 'public.user_profile'::regclass
    ) THEN
        CREATE TRIGGER handle_updated_at 
        BEFORE UPDATE ON public.user_profile
        FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
    END IF;
END $$;
