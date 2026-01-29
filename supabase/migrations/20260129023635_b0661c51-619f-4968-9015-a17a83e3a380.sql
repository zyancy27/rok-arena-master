-- Fix battle creation RLS: accept both auth.uid() and raw JWT claim contexts

DROP POLICY IF EXISTS "Authenticated users can create battles" ON public.battles;

CREATE POLICY "Authenticated users can create battles"
ON public.battles
FOR INSERT
TO public
WITH CHECK (
  -- Primary check (expected)
  auth.uid() IS NOT NULL
  OR
  -- Fallbacks for cases where auth.uid() isn't populated but PostgREST did set JWT claims
  (
    nullif(current_setting('request.jwt.claim.sub', true), '') IS NOT NULL
    AND nullif(current_setting('request.jwt.claim.role', true), '') = 'authenticated'
  )
  OR
  (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') IS NOT NULL
    AND (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'authenticated'
  )
);
