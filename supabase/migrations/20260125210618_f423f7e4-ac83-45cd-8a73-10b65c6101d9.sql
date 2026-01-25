-- Add has_sun column to sun_customizations table
ALTER TABLE public.sun_customizations
ADD COLUMN has_sun BOOLEAN NOT NULL DEFAULT true;