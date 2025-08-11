-- Create password_resets table for handling password reset functionality
DO $$ 
BEGIN
    -- Check if the migration '20250510_create_password_resets_table.sql' has already been executed successfully
    IF NOT EXISTS (
        SELECT 1
        FROM public.migration_logs
        WHERE migration_name = '20250510_create_password_resets_table.sql'
        AND status = 'success'
    ) THEN
        -- Create password_resets table
        CREATE TABLE IF NOT EXISTS public.password_resets (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
            email TEXT NULL,
            token TEXT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NULL,
            user_id UUID NULL,
            used_at TIMESTAMP WITH TIME ZONE NULL,
            CONSTRAINT password_resets_pkey PRIMARY KEY (id),
            CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles (id) ON DELETE CASCADE
        ) TABLESPACE pg_default;

        -- Enable RLS (Row Level Security)
        ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

        -- Create policies for password_resets table
        
        -- 1. Users can view their own password reset requests
        CREATE POLICY "Users can view own password resets" ON public.password_resets
            FOR SELECT USING (user_id = auth.uid());

        -- 2. Users can insert their own password reset requests
        CREATE POLICY "Users can insert own password resets" ON public.password_resets
            FOR INSERT WITH CHECK (user_id = auth.uid());

        -- 3. Users can update their own password reset requests (for marking as used)
        CREATE POLICY "Users can update own password resets" ON public.password_resets
            FOR UPDATE USING (user_id = auth.uid());

        -- 4. Admins can view all password reset requests
        CREATE POLICY "Admins can view all password resets" ON public.password_resets
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles up
                    JOIN public.roles r ON up.role_id = r.id
                    WHERE up.id = auth.uid() AND r.name = 'admin'
                )
            );

        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_password_resets_token ON public.password_resets(token);
        CREATE INDEX IF NOT EXISTS idx_password_resets_email ON public.password_resets(email);
        CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON public.password_resets(user_id);
        CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON public.password_resets(expires_at);

        -- Log the successful migration
        INSERT INTO public.migration_logs (migration_name, status, message)
        VALUES ('20250510_create_password_resets_table.sql', 'success', 'Password resets table created successfully.');
    END IF;
END $$;
