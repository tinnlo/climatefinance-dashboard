-- Function to delete a user from both auth.users and public.users tables
-- This function should be executed in the Supabase SQL Editor
CREATE OR REPLACE FUNCTION public.delete_user_complete(user_id UUID)
RETURNS boolean AS $$
DECLARE
  success boolean := false;
BEGIN
  -- Delete from public.users table first
  DELETE FROM public.users WHERE id = user_id;
  
  -- Then delete from auth.users table
  DELETE FROM auth.users WHERE id = user_id;
  
  -- Check if the user was deleted from auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id) THEN
    success := true;
  END IF;
  
  RETURN success;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error deleting user: %', SQLERRM;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.delete_user_complete(UUID) TO service_role; 