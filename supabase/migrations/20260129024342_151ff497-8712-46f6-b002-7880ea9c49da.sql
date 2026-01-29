-- Allow friends to view each other's profiles even if private
-- This enables PvP challenges between friends regardless of privacy mode.

DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  auth.uid() = id
  OR is_admin_or_moderator()
  OR (
    auth.uid() IS NOT NULL
    AND (
      is_private = false
      OR EXISTS (
        SELECT 1
        FROM public.friendships f
        WHERE f.is_follow = false
          AND f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = public.profiles.id)
            OR
            (f.addressee_id = auth.uid() AND f.requester_id = public.profiles.id)
          )
      )
    )
  )
);