-- Add physics properties to planet_customizations
-- gravity: relative to Earth (1.0 = Earth gravity, 2.0 = 2x Earth, etc.)
-- radius: relative to Earth (1.0 = Earth size)
-- orbital_distance: AU from sun (affects position in solar system)

ALTER TABLE public.planet_customizations
ADD COLUMN gravity DECIMAL(4,2) DEFAULT NULL,
ADD COLUMN radius DECIMAL(4,2) DEFAULT NULL,
ADD COLUMN orbital_distance DECIMAL(5,2) DEFAULT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN public.planet_customizations.gravity IS 'Surface gravity relative to Earth (1.0 = 9.8 m/s²). Affects character stats.';
COMMENT ON COLUMN public.planet_customizations.radius IS 'Planet radius relative to Earth. Affects visual size and mass calculation.';
COMMENT ON COLUMN public.planet_customizations.orbital_distance IS 'Distance from sun in AU (Astronomical Units). Determines orbit position.';