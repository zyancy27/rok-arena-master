-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create battles" ON public.battles;

-- Recreate as a PERMISSIVE policy (default behavior)
CREATE POLICY "Authenticated users can create battles"
  ON public.battles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);