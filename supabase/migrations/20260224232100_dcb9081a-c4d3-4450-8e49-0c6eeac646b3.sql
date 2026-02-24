
CREATE TABLE public.saved_battle_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  composition jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_battle_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own themes"
  ON public.saved_battle_themes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own themes"
  ON public.saved_battle_themes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own themes"
  ON public.saved_battle_themes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own themes"
  ON public.saved_battle_themes FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_battle_themes_updated_at
  BEFORE UPDATE ON public.saved_battle_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
