-- Add fix pass fields to generation_jobs table
ALTER TABLE generation_jobs 
ADD COLUMN IF NOT EXISTS fix_flags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS fix_notes text;

-- Create character_sections table for custom user-defined sections
CREATE TABLE IF NOT EXISTS character_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on character_sections
ALTER TABLE character_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for character_sections
CREATE POLICY "Users can view their own sections"
  ON character_sections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sections"
  ON character_sections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sections"
  ON character_sections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sections"
  ON character_sections FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at on character_sections
CREATE TRIGGER update_character_sections_updated_at
  BEFORE UPDATE ON character_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create private storage bucket for character models
INSERT INTO storage.buckets (id, name, public)
VALUES ('character-models', 'character-models', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for character-models bucket
CREATE POLICY "Users can upload their own models"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'character-models' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own models"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'character-models' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own models"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'character-models' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own models"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'character-models' AND auth.uid()::text = (storage.foldername(name))[1]);