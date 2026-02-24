
-- Create custom_battle_locations table for saving battle locations
CREATE TABLE public.custom_battle_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_emergency BOOLEAN DEFAULT false,
  hazard_description TEXT,
  countdown_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_battle_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own locations"
  ON public.custom_battle_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own locations"
  ON public.custom_battle_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locations"
  ON public.custom_battle_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locations"
  ON public.custom_battle_locations FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_custom_battle_locations_updated_at
  BEFORE UPDATE ON public.custom_battle_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
