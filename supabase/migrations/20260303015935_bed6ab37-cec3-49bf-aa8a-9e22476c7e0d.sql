
-- Prevent duplicate character names per user
CREATE UNIQUE INDEX idx_characters_user_name ON public.characters (user_id, lower(name));

-- Prevent duplicate planet names per user
CREATE UNIQUE INDEX idx_planets_user_name ON public.planet_customizations (user_id, lower(planet_name));

-- Prevent duplicate solar system names per user
CREATE UNIQUE INDEX idx_solar_systems_user_name ON public.solar_systems (user_id, lower(name));
