-- Create character_groups table for storing groups/teams
CREATE TABLE public.character_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8B5CF6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for character-group membership
CREATE TABLE public.character_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.character_groups(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, character_id)
);

-- Enable RLS
ALTER TABLE public.character_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_group_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for character_groups
CREATE POLICY "Users can view their own groups"
  ON public.character_groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own groups"
  ON public.character_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own groups"
  ON public.character_groups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own groups"
  ON public.character_groups FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for character_group_members
CREATE POLICY "Users can view members of their groups"
  ON public.character_group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.character_groups
    WHERE id = character_group_members.group_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can add members to their groups"
  ON public.character_group_members FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.character_groups
    WHERE id = character_group_members.group_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can remove members from their groups"
  ON public.character_group_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.character_groups
    WHERE id = character_group_members.group_id
    AND user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_character_groups_updated_at
  BEFORE UPDATE ON public.character_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();