-- Add dynamic environment settings to battles
ALTER TABLE public.battles
ADD COLUMN dynamic_environment BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN environment_effects TEXT NULL;