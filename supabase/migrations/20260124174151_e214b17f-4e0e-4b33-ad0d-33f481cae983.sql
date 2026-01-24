-- Create junction table for many-to-many relationship between stories and characters
CREATE TABLE public.story_characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, character_id)
);

-- Enable RLS
ALTER TABLE public.story_characters ENABLE ROW LEVEL SECURITY;

-- Users can view story_characters for their own stories
CREATE POLICY "Users can view their own story characters"
ON public.story_characters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = story_characters.story_id
    AND stories.user_id = auth.uid()
  )
);

-- Users can view story_characters for published stories
CREATE POLICY "Anyone can view published story characters"
ON public.story_characters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = story_characters.story_id
    AND stories.is_published = true
  )
);

-- Users can manage story_characters for their own stories
CREATE POLICY "Users can insert their own story characters"
ON public.story_characters FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = story_characters.story_id
    AND stories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own story characters"
ON public.story_characters FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.stories
    WHERE stories.id = story_characters.story_id
    AND stories.user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_story_characters_story_id ON public.story_characters(story_id);
CREATE INDEX idx_story_characters_character_id ON public.story_characters(character_id);