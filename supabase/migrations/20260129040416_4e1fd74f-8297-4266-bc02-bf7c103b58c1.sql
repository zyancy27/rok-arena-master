-- Create helper to create a pending battle challenge and return the new battle id
-- This avoids needing SELECT/RETURNING on battles before participants exist (which can trigger RLS failures).

CREATE OR REPLACE FUNCTION public.create_battle_challenge(
  _challenged_user_id uuid,
  _location_1 text,
  _challenger_character_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _battle_id uuid;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _challenged_user_id IS NULL THEN
    RAISE EXCEPTION 'challenged_user_id is required';
  END IF;

  IF _location_1 IS NULL OR btrim(_location_1) = '' THEN
    RAISE EXCEPTION 'location_1 is required';
  END IF;

  -- Ensure challenger owns the character they are using
  IF NOT public.is_character_owner(_challenger_character_id) THEN
    RAISE EXCEPTION 'Not allowed: character does not belong to you';
  END IF;

  INSERT INTO public.battles (status, location_1, challenged_user_id)
  VALUES ('pending', btrim(_location_1), _challenged_user_id)
  RETURNING id INTO _battle_id;

  INSERT INTO public.battle_participants (battle_id, character_id, turn_order)
  VALUES (_battle_id, _challenger_character_id, 1);

  RETURN _battle_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_battle_challenge(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_battle_challenge(uuid, text, uuid) TO authenticated;