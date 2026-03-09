
-- Allow authenticated users to read founder_status of any user (for profile badges)
CREATE POLICY "Anyone can check founder status"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Drop the old restrictive select policy
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
