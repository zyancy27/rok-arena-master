
-- Create character AI notes table for feedback & memory refinement
CREATE TABLE public.character_ai_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('move_clarification', 'personality', 'tactical_behavior')),
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('current_battle', 'future_battles', 'global')),
  note TEXT NOT NULL,
  battle_id UUID REFERENCES public.battles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.character_ai_notes ENABLE ROW LEVEL SECURITY;

-- Users can only manage notes for characters they own
CREATE POLICY "Users can view notes for their own characters"
  ON public.character_ai_notes FOR SELECT
  USING (public.is_character_owner(character_id));

CREATE POLICY "Users can create notes for their own characters"
  ON public.character_ai_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_character_owner(character_id));

CREATE POLICY "Users can update their own notes"
  ON public.character_ai_notes FOR UPDATE
  USING (auth.uid() = user_id AND public.is_character_owner(character_id));

CREATE POLICY "Users can delete their own notes"
  ON public.character_ai_notes FOR DELETE
  USING (auth.uid() = user_id AND public.is_character_owner(character_id));

-- Index for fast lookup
CREATE INDEX idx_character_ai_notes_character_id ON public.character_ai_notes(character_id);
CREATE INDEX idx_character_ai_notes_user_id ON public.character_ai_notes(user_id);
