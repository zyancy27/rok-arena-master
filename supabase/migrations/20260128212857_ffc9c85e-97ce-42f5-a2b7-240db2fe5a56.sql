-- Add battle turn color preference to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS battle_turn_color text DEFAULT '#8B5CF6';

-- Add a comment for clarity
COMMENT ON COLUMN public.profiles.battle_turn_color IS 'User preferred color for battle turn indicator (hex format)';