-- Add Battle IQ stat column to characters table
ALTER TABLE public.characters 
ADD COLUMN stat_battle_iq integer DEFAULT 50;

-- Add concentration_uses column to track uses per battle
ALTER TABLE public.battles
ADD COLUMN concentration_uses jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.characters.stat_battle_iq IS 'Combat instincts and tactical awareness in battle (0-100). Distinct from Intelligence - measures fight IQ like Goku.';
COMMENT ON COLUMN public.battles.concentration_uses IS 'Tracks concentration uses per character: {"character_id": uses_remaining}';