-- Create table for planet customizations
CREATE TABLE public.planet_customizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  planet_name TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  color TEXT,
  has_rings BOOLEAN DEFAULT NULL,
  moon_count INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, planet_name)
);

-- Enable RLS
ALTER TABLE public.planet_customizations ENABLE ROW LEVEL SECURITY;

-- Users can view all planet customizations (for shared galaxy view)
CREATE POLICY "Anyone can view planet customizations"
ON public.planet_customizations
FOR SELECT
USING (true);

-- Users can create their own customizations
CREATE POLICY "Users can create their own planet customizations"
ON public.planet_customizations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own customizations
CREATE POLICY "Users can update their own planet customizations"
ON public.planet_customizations
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own customizations
CREATE POLICY "Users can delete their own planet customizations"
ON public.planet_customizations
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_planet_customizations_updated_at
BEFORE UPDATE ON public.planet_customizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();