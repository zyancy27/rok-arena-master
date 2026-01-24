-- Enable realtime for battle_participants table to notify users of new challenges
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_participants;