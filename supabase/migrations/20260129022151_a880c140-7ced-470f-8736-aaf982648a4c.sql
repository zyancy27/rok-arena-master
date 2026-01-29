-- Drop the existing INSERT policy and recreate it to apply to public role
-- but still require auth.uid() IS NOT NULL for the check
DROP POLICY IF EXISTS "Authenticated users can create battles" ON public.battles;

-- Create new policy that applies to all roles but checks for authenticated user
CREATE POLICY "Authenticated users can create battles"
  ON public.battles
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);