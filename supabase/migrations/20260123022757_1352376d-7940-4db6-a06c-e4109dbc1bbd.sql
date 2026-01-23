-- Create table for sun customizations
CREATE TABLE public.sun_customizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  color TEXT NOT NULL DEFAULT '#FDB813',
  temperature INTEGER NOT NULL DEFAULT 5778,
  name TEXT DEFAULT 'Sol',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT sun_customizations_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.sun_customizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view sun customizations"
  ON public.sun_customizations
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own sun customization"
  ON public.sun_customizations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sun customization"
  ON public.sun_customizations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sun customization"
  ON public.sun_customizations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_sun_customizations_updated_at
  BEFORE UPDATE ON public.sun_customizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();