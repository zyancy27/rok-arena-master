-- Create a secure RPC function for setting user roles
-- This ensures admin authorization is enforced server-side
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  target_user_id UUID,
  new_role app_role
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin (only admins can change roles)
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can change user roles';
  END IF;
  
  -- Prevent users from demoting themselves (safety check)
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify your own role';
  END IF;
  
  -- Delete existing role(s) for the user
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  -- Insert new role
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, new_role);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, app_role) TO authenticated;

-- Add comment documenting security requirements
COMMENT ON FUNCTION public.admin_set_user_role IS 'Secure RPC for admin role management. Enforces server-side admin authorization. SECURITY DEFINER is required to bypass RLS on user_roles table for the admin operation.';