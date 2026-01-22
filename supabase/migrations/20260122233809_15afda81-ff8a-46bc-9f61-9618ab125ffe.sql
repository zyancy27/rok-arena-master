-- Add image_url column to characters table
ALTER TABLE public.characters ADD COLUMN image_url text;

-- Create storage bucket for character images
INSERT INTO storage.buckets (id, name, public) VALUES ('character-images', 'character-images', true);

-- Storage policies for character images bucket
CREATE POLICY "Character images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'character-images');

CREATE POLICY "Users can upload their character images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'character-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their character images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'character-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their character images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'character-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);