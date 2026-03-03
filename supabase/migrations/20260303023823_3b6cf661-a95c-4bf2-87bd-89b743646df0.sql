
-- Create sub_races table
CREATE TABLE public.sub_races (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  race_id UUID NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  typical_physiology TEXT,
  typical_abilities TEXT,
  cultural_traits TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_races ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own sub races"
ON public.sub_races FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sub races"
ON public.sub_races FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sub races"
ON public.sub_races FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sub races"
ON public.sub_races FOR DELETE
USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE TRIGGER update_sub_races_updated_at
BEFORE UPDATE ON public.sub_races
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
