-- Create moon_customizations table to store moon data
CREATE TABLE public.moon_customizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  planet_name text NOT NULL,
  moon_name text NOT NULL,
  display_name text,
  description text,
  color text DEFAULT '#9CA3AF',
  gravity numeric DEFAULT 0.16,
  radius numeric DEFAULT 0.27,
  solar_system_id uuid REFERENCES public.solar_systems(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, planet_name, moon_name, solar_system_id)
);

-- Enable RLS
ALTER TABLE public.moon_customizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view moon customizations"
ON public.moon_customizations
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own moon customizations"
ON public.moon_customizations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own moon customizations"
ON public.moon_customizations
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own moon customizations"
ON public.moon_customizations
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_moon_customizations_updated_at
BEFORE UPDATE ON public.moon_customizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add home_moon column to characters table
ALTER TABLE public.characters
ADD COLUMN home_moon text;