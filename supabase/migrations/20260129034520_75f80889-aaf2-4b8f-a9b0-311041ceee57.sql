-- Drop and recreate the INSERT policy with robust JWT validation
DROP POLICY IF EXISTS "Authenticated users can create battles" ON public.battles;

CREATE POLICY "Authenticated users can create battles"
ON public.battles
FOR INSERT
TO public
WITH CHECK (
  -- Standard auth check
  auth.uid() IS NOT NULL
  OR
  -- Fallback: Direct JWT claim validation for edge cases
  (
    (current_setting('request.jwt.claims', true)::json->>'sub') IS NOT NULL
    AND (current_setting('request.jwt.claims', true)::json->>'role') = 'authenticated'
  )
);