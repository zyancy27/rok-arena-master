-- Create story chapters table
CREATE TABLE public.story_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, chapter_number)
);

-- Enable RLS
ALTER TABLE public.story_chapters ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can manage chapters of their own stories
CREATE POLICY "Users can view chapters of their own stories"
ON public.story_chapters
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = story_chapters.story_id 
    AND stories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view chapters of published stories"
ON public.story_chapters
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = story_chapters.story_id 
    AND stories.is_published = true
  )
);

CREATE POLICY "Users can create chapters for their own stories"
ON public.story_chapters
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = story_chapters.story_id 
    AND stories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update chapters of their own stories"
ON public.story_chapters
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = story_chapters.story_id 
    AND stories.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete chapters of their own stories"
ON public.story_chapters
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = story_chapters.story_id 
    AND stories.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_story_chapters_updated_at
BEFORE UPDATE ON public.story_chapters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();