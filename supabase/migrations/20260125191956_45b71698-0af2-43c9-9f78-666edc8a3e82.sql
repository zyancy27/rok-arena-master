-- Create enum types for 3D generation options
CREATE TYPE public.character_template AS ENUM (
  'adult_basic', 'adult_slim', 'adult_bulky', 'adult_longlimb',
  'kid_basic', 'kid_slim', 'kid_bulky', 'kid_longlimb'
);

CREATE TYPE public.visual_style AS ENUM ('toon', 'semi');
CREATE TYPE public.motion_mode AS ENUM ('static', 'idle', 'idle_interactive');
CREATE TYPE public.model_quality AS ENUM ('mobile_low', 'mobile_med', 'desktop');
CREATE TYPE public.generation_status AS ENUM ('none', 'queued', 'processing', 'done', 'error');
CREATE TYPE public.image_role AS ENUM ('front', 'side', 'back', 'three_quarter', 'detail', 'other');

-- Character 3D configuration table (separate from main characters table)
CREATE TABLE public.character_3d_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  template public.character_template NOT NULL DEFAULT 'adult_basic',
  visual_style public.visual_style NOT NULL DEFAULT 'toon',
  motion_mode public.motion_mode NOT NULL DEFAULT 'static',
  quality public.model_quality NOT NULL DEFAULT 'mobile_med',
  height_morph NUMERIC(3,2) NOT NULL DEFAULT 1.0 CHECK (height_morph >= 0.8 AND height_morph <= 1.2),
  shoulders_morph NUMERIC(3,2) NOT NULL DEFAULT 1.0 CHECK (shoulders_morph >= 0.8 AND shoulders_morph <= 1.2),
  model_glb_url TEXT,
  preview_url TEXT,
  current_status public.generation_status NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(character_id)
);

-- Character reference images table
CREATE TABLE public.character_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  image_url TEXT NOT NULL,
  role public.image_role NOT NULL DEFAULT 'front',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generation jobs table for tracking processing
CREATE TABLE public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES public.character_3d_configs(id) ON DELETE CASCADE,
  status public.generation_status NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  logs JSONB DEFAULT '[]'::jsonb,
  template public.character_template NOT NULL,
  height_morph NUMERIC(3,2) NOT NULL,
  shoulders_morph NUMERIC(3,2) NOT NULL,
  visual_style public.visual_style NOT NULL,
  motion_mode public.motion_mode NOT NULL,
  quality public.model_quality NOT NULL,
  result_glb_url TEXT,
  result_preview_url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.character_3d_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for character_3d_configs
CREATE POLICY "Users can view their own 3D configs"
ON public.character_3d_configs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.characters 
    WHERE characters.id = character_3d_configs.character_id 
    AND characters.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create 3D configs for their characters"
ON public.character_3d_configs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.characters 
    WHERE characters.id = character_3d_configs.character_id 
    AND characters.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own 3D configs"
ON public.character_3d_configs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.characters 
    WHERE characters.id = character_3d_configs.character_id 
    AND characters.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own 3D configs"
ON public.character_3d_configs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.characters 
    WHERE characters.id = character_3d_configs.character_id 
    AND characters.user_id = auth.uid()
  )
);

-- RLS policies for character_images
CREATE POLICY "Users can view their own character images"
ON public.character_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.characters 
    WHERE characters.id = character_images.character_id 
    AND characters.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload images for their characters"
ON public.character_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.characters 
    WHERE characters.id = character_images.character_id 
    AND characters.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own character images"
ON public.character_images FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.characters 
    WHERE characters.id = character_images.character_id 
    AND characters.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own character images"
ON public.character_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.characters 
    WHERE characters.id = character_images.character_id 
    AND characters.user_id = auth.uid()
  )
);

-- RLS policies for generation_jobs
CREATE POLICY "Users can view their own generation jobs"
ON public.generation_jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.characters 
    WHERE characters.id = generation_jobs.character_id 
    AND characters.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create jobs for their characters"
ON public.generation_jobs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.characters 
    WHERE characters.id = generation_jobs.character_id 
    AND characters.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own jobs"
ON public.generation_jobs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.characters 
    WHERE characters.id = generation_jobs.character_id 
    AND characters.user_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_character_3d_configs_updated_at
BEFORE UPDATE ON public.character_3d_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generation_jobs_updated_at
BEFORE UPDATE ON public.generation_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for reference images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('character-reference-images', 'character-reference-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for character reference images
CREATE POLICY "Users can upload reference images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'character-reference-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view reference images"
ON storage.objects FOR SELECT
USING (bucket_id = 'character-reference-images');

CREATE POLICY "Users can update their reference images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'character-reference-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their reference images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'character-reference-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);