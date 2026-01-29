-- Simplify the INSERT policy for battles to just check authenticated user
-- The current policy has complex JWT fallback checks that may be causing issues

DROP POLICY IF EXISTS "Authenticated users can create battles" ON public.battles;

CREATE POLICY "Authenticated users can create battles"
ON public.battles
FOR INSERT
TO authenticated
WITH CHECK (true);