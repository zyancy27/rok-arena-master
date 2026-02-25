
CREATE TABLE public.character_constructs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  construct_type text NOT NULL DEFAULT 'object',
  persistence text NOT NULL DEFAULT 'recurring',
  durability_level text NOT NULL DEFAULT 'medium',
  durability_numeric integer DEFAULT 50,
  behavior_summary text,
  limitations text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.character_constructs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own character constructs"
  ON public.character_constructs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create constructs for their characters"
  ON public.character_constructs FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.characters WHERE id = character_constructs.character_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own constructs"
  ON public.character_constructs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own constructs"
  ON public.character_constructs FOR DELETE
  USING (auth.uid() = user_id);
