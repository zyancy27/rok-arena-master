-- Drop the existing restrictive SELECT policy on races
DROP POLICY IF EXISTS "Users can view their own races" ON public.races;

-- Create a new SELECT policy that allows viewing races from non-private profiles (matching characters pattern)
CREATE POLICY "Anyone can view races from public profiles" 
ON public.races 
FOR SELECT 
USING (
  (auth.uid() = user_id) 
  OR (NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = races.user_id 
    AND profiles.is_private = true
  ))
  OR is_admin_or_moderator()
);