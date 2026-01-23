-- Create races table for user-defined races
CREATE TABLE public.races (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  home_planet TEXT,
  typical_physiology TEXT,
  typical_abilities TEXT,
  cultural_traits TEXT,
  average_lifespan TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own races" 
ON public.races FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own races" 
ON public.races FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own races" 
ON public.races FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own races" 
ON public.races FOR DELETE USING (auth.uid() = user_id);

-- Add race_id to characters table
ALTER TABLE public.characters ADD COLUMN race_id UUID REFERENCES public.races(id) ON DELETE SET NULL;

-- Create storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('lore-documents', 'lore-documents', false);

-- Storage policies for lore documents
CREATE POLICY "Users can upload their own lore documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lore-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own lore documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'lore-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own lore documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'lore-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for updated_at
CREATE TRIGGER update_races_updated_at
BEFORE UPDATE ON public.races
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();