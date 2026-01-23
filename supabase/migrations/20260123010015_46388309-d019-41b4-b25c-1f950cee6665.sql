-- Add character stats (0-100 scale for each)
ALTER TABLE public.characters
ADD COLUMN stat_intelligence integer DEFAULT 50 CHECK (stat_intelligence >= 0 AND stat_intelligence <= 100),
ADD COLUMN stat_strength integer DEFAULT 50 CHECK (stat_strength >= 0 AND stat_strength <= 100),
ADD COLUMN stat_power integer DEFAULT 50 CHECK (stat_power >= 0 AND stat_power <= 100),
ADD COLUMN stat_speed integer DEFAULT 50 CHECK (stat_speed >= 0 AND stat_speed <= 100),
ADD COLUMN stat_durability integer DEFAULT 50 CHECK (stat_durability >= 0 AND stat_durability <= 100),
ADD COLUMN stat_stamina integer DEFAULT 50 CHECK (stat_stamina >= 0 AND stat_stamina <= 100),
ADD COLUMN stat_skill integer DEFAULT 50 CHECK (stat_skill >= 0 AND stat_skill <= 100),
ADD COLUMN stat_luck integer DEFAULT 50 CHECK (stat_luck >= 0 AND stat_luck <= 100);