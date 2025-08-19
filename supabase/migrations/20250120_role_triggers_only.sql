-- Simple role change trigger - production safe
-- Only creates triggers, no new tables or complex migrations

-- Create or replace the role change notification function
CREATE OR REPLACE FUNCTION public.notify_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger on role_id changes
  IF OLD.role_id IS DISTINCT FROM NEW.role_id THEN
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    
    -- Log the change for debugging
    RAISE NOTICE 'Role changed for user % from % to %', NEW.id, OLD.role_id, NEW.role_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_role_change ON public.user_profiles;
CREATE TRIGGER on_role_change
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_role_change();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Role change trigger installed successfully!';
  RAISE NOTICE 'The app will detect role changes automatically.';
  RAISE NOTICE '==========================================';
END $$;
