-- Fix battle creation RLS: rely on user id presence rather than role claim
DROP POLICY IF EXISTS "Authenticated users can create battles" ON public.battles;

CREATE POLICY "Authenticated users can create battles"
ON public.battles
FOR INSERT
TO public
WITH CHECK (
  -- Normal path
  auth.uid() IS NOT NULL
  OR
  -- Fallback when auth.uid() is unexpectedly null but JWT claims are present
  (current_setting('request.jwt.claims', true)::json ->> 'sub') IS NOT NULL
);
