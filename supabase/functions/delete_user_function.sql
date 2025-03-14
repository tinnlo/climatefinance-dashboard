-- Function to delete a user from auth.users table
-- This function should be executed in the Supabase SQL Editor
CREATE OR REPLACE FUNCTION public.delete_user_auth(user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete from auth.users table
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_auth(UUID) TO service_role; 