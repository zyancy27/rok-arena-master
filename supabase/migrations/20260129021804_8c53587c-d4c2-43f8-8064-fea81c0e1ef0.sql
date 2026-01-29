-- Grant INSERT, SELECT, UPDATE, DELETE permissions on battles table to authenticated users
-- RLS policies only work if the role has base table privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battles TO anon;

-- Also grant on battle_participants in case it's missing
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_participants TO anon;

-- Grant on battle_messages
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.battle_messages TO anon;