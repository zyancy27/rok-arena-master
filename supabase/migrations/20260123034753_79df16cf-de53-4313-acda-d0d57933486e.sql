-- Create solar_systems table
CREATE TABLE public.solar_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Galaxy',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solar_systems ENABLE ROW LEVEL SECURITY;

-- RLS policies for solar_systems
CREATE POLICY "Anyone can view solar systems" 
ON public.solar_systems 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own solar systems" 
ON public.solar_systems 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own solar systems" 
ON public.solar_systems 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own solar systems" 
ON public.solar_systems 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add solar_system_id to planet_customizations
ALTER TABLE public.planet_customizations 
ADD COLUMN solar_system_id UUID REFERENCES public.solar_systems(id) ON DELETE CASCADE;

-- Add solar_system_id to sun_customizations
ALTER TABLE public.sun_customizations 
ADD COLUMN solar_system_id UUID REFERENCES public.solar_systems(id) ON DELETE CASCADE;

-- Add solar_system_id to characters (optional association)
ALTER TABLE public.characters 
ADD COLUMN solar_system_id UUID REFERENCES public.solar_systems(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_solar_systems_updated_at
BEFORE UPDATE ON public.solar_systems
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_planet_customizations_solar_system ON public.planet_customizations(solar_system_id);
CREATE INDEX idx_sun_customizations_solar_system ON public.sun_customizations(solar_system_id);
CREATE INDEX idx_characters_solar_system ON public.characters(solar_system_id);