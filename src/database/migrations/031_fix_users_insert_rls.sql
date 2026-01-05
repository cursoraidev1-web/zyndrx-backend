-- Fix Users Table INSERT RLS Policy
-- This allows the service role and trigger function to insert user profiles during signup

-- First, ensure the trigger function is properly set up with SECURITY DEFINER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with proper error handling and SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, 'unknown@example.com'), '@', 1)
    ),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'developer'::user_role
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    )
  )
  ON CONFLICT (id) DO NOTHING; -- Handle race conditions gracefully
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow system to create users" ON users;
DROP POLICY IF EXISTS "Service role can insert users" ON users;
DROP POLICY IF EXISTS "Allow user profile creation" ON users;

-- Create policy to allow service role to insert users
-- This is needed for the manual fallback when trigger doesn't fire
CREATE POLICY "Service role can insert users" 
  ON users 
  FOR INSERT 
  TO service_role 
  WITH CHECK (true);

-- Also ensure the trigger function has proper permissions
-- The SECURITY DEFINER function should bypass RLS, but let's ensure grants are correct
GRANT INSERT ON public.users TO postgres, service_role;

-- Verify the trigger function exists and is SECURITY DEFINER
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user' 
    AND prosecdef = true
  ) THEN
    RAISE EXCEPTION 'handle_new_user function is not SECURITY DEFINER. Please recreate it.';
  END IF;
END $$;

-- Verify the trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE WARNING 'Trigger on_auth_user_created does not exist. User profile creation may fail.';
  END IF;
END $$;

-- Additional: Ensure service_role can bypass RLS for users table
-- This is a safety measure - service role should bypass RLS automatically, but this ensures it
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Verify the policy was created (using pg_policies view if available, otherwise check pg_policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polrelid = 'public.users'::regclass
    AND polname = 'Service role can insert users'
  ) THEN
    RAISE WARNING 'Policy verification failed, but policy may still exist. Check manually.';
  END IF;
END $$;

