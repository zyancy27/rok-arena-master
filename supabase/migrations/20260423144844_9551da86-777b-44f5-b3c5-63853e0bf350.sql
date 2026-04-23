
-- Add founder eligibility tracking
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS founder_reserved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS founder_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS active_days_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date date;

-- Mark existing founders as reserved + confirmed (grandfather them)
UPDATE public.user_subscriptions
SET founder_reserved = true,
    founder_reserved_at = COALESCE(founder_reserved_at, created_at),
    founder_confirmed_at = COALESCE(founder_confirmed_at, created_at)
WHERE founder_status = true AND founder_reserved = false;

-- Update signup trigger: only reserve a founder slot if under 25, do NOT auto-grant founder_status
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reserved_count int;
  can_reserve boolean := false;
BEGIN
  SELECT count(*) INTO reserved_count
  FROM public.user_subscriptions
  WHERE founder_reserved = true;

  IF reserved_count < 25 THEN
    can_reserve := true;
  END IF;

  INSERT INTO public.user_subscriptions (
    user_id, storage_tier, ai_subscription_active, founder_status,
    founder_reserved, founder_reserved_at
  )
  VALUES (
    NEW.id, 'free', false, false,
    can_reserve, CASE WHEN can_reserve THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Function: how many founder spots remain
CREATE OR REPLACE FUNCTION public.founder_spots_remaining()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0, 25 - (SELECT count(*)::int FROM public.user_subscriptions WHERE founder_reserved = true));
$$;

-- Function: record activity for the calling user; promotes to founder once 5 active days are reached (if reserved)
CREATE OR REPLACE FUNCTION public.record_user_activity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.user_subscriptions;
  today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  SELECT * INTO rec FROM public.user_subscriptions WHERE user_id = uid;
  IF NOT FOUND THEN
    INSERT INTO public.user_subscriptions (user_id, storage_tier, last_active_date, active_days_count)
    VALUES (uid, 'free', today, 1)
    RETURNING * INTO rec;
  ELSIF rec.last_active_date IS DISTINCT FROM today THEN
    UPDATE public.user_subscriptions
    SET active_days_count = active_days_count + 1,
        last_active_date = today
    WHERE user_id = uid
    RETURNING * INTO rec;
  END IF;

  -- Promote to founder if reserved + 5 active days reached + not already confirmed
  IF rec.founder_reserved = true AND rec.active_days_count >= 5 AND rec.founder_confirmed_at IS NULL THEN
    UPDATE public.user_subscriptions
    SET founder_status = true,
        ai_subscription_active = true,
        founder_confirmed_at = now(),
        storage_tier = 'founder'
    WHERE user_id = uid
    RETURNING * INTO rec;
  END IF;

  RETURN jsonb_build_object(
    'active_days_count', rec.active_days_count,
    'founder_reserved', rec.founder_reserved,
    'founder_status', rec.founder_status,
    'founder_confirmed_at', rec.founder_confirmed_at
  );
END;
$$;
