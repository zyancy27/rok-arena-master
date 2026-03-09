
-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_tier TEXT NOT NULL DEFAULT 'free',
  ai_subscription_active BOOLEAN NOT NULL DEFAULT false,
  ai_subscription_expires TIMESTAMP WITH TIME ZONE,
  founder_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can manage all (for edge functions)
CREATE POLICY "Service role full access"
  ON public.user_subscriptions FOR ALL
  USING (auth.uid() IS NOT NULL OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Auto-create subscription row for new users as founders (existing users get founder status)
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id, storage_tier, ai_subscription_active, founder_status)
  VALUES (NEW.id, 'founder', true, true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger for new signups
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Backfill existing users as founders
INSERT INTO public.user_subscriptions (user_id, storage_tier, ai_subscription_active, founder_status)
SELECT id, 'founder', true, true
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
