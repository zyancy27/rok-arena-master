-- Fix battle creation RLS: allow only logged-in users to INSERT battles
-- Use TO public because PostgREST requests may run under different roles, while auth.uid() enforces login.

DROP POLICY IF EXISTS "Authenticated users can create battles" ON public.battles;

CREATE POLICY "Authenticated users can create battles"
ON public.battles
FOR INSERT
TO public
WITH CHECK (auth.uid() IS NOT NULL);
