-- Fix battle challenge creation being blocked by RLS in some sessions
-- Recreate INSERT policy with role-based check (more reliable than auth.uid() alone)

DROP POLICY IF EXISTS "Authenticated users can create battles" ON public.battles;

CREATE POLICY "Authenticated users can create battles"
ON public.battles
FOR INSERT
TO public
WITH CHECK (
  -- Primary: authenticated DB role
  auth.role() = 'authenticated'
  OR
  -- Fallback: direct JWT claim validation
  (
    (current_setting('request.jwt.claims', true)::json->>'sub') IS NOT NULL
    AND (current_setting('request.jwt.claims', true)::json->>'role') = 'authenticated'
  )
);
