-- Fix: Require authentication to view characters (prevent anonymous enumeration)
DROP POLICY IF EXISTS "Anyone can view public characters" ON public.characters;

CREATE POLICY "Authenticated users can view public characters"
ON public.characters FOR SELECT
USING (
  (auth.uid() = user_id)
  OR (auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = characters.user_id
    AND profiles.is_private = true
  ))
  OR is_admin_or_moderator()
);