-- Revert overly permissive RLS policy and restore secure INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create battles" ON public.battles;

CREATE POLICY "Authenticated users can create battles"
  ON public.battles
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);