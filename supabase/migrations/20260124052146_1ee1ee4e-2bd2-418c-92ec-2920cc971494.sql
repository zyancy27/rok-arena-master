-- Fix sun_customizations RLS policy to require authentication for viewing
-- This prevents anonymous user enumeration via the user_id field

DROP POLICY IF EXISTS "Anyone can view sun customizations" ON public.sun_customizations;

CREATE POLICY "Authenticated users can view sun customizations" 
ON public.sun_customizations 
FOR SELECT 
USING (
  (auth.uid() = user_id) 
  OR (auth.uid() IS NOT NULL) 
  OR is_admin_or_moderator()
);