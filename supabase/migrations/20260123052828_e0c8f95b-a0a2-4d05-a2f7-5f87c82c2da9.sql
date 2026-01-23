-- Drop the existing user_id unique constraint (which only allows one sun per user)
ALTER TABLE public.sun_customizations DROP CONSTRAINT IF EXISTS sun_customizations_user_id_key;

-- Add a composite unique constraint for user_id and solar_system_id
-- This allows each user to have one sun per solar system
ALTER TABLE public.sun_customizations 
ADD CONSTRAINT sun_customizations_user_solar_system_unique 
UNIQUE (user_id, solar_system_id);