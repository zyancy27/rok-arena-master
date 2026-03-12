
CREATE TABLE public.narrator_sentiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  nickname text,
  sentiment_score integer NOT NULL DEFAULT 0,
  personality_notes text,
  opinion_summary text,
  memorable_moments text[] NOT NULL DEFAULT '{}',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (character_id)
);

ALTER TABLE public.narrator_sentiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sentiment for their own characters"
  ON public.narrator_sentiments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.characters c WHERE c.id = narrator_sentiments.character_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Service role and active campaign participants can upsert"
  ON public.narrator_sentiments FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.characters c WHERE c.id = narrator_sentiments.character_id AND c.user_id = auth.uid()
  ));

CREATE POLICY "Owner can update sentiment"
  ON public.narrator_sentiments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.characters c WHERE c.id = narrator_sentiments.character_id AND c.user_id = auth.uid()
  ));
