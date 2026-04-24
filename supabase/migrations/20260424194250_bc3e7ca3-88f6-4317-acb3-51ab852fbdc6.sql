
-- Community suggestions feature
CREATE TABLE public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  page_context TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view suggestions"
  ON public.suggestions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create suggestions"
  ON public.suggestions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions"
  ON public.suggestions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_moderator());

CREATE POLICY "Users can delete their own suggestions"
  ON public.suggestions FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_or_moderator());

CREATE INDEX idx_suggestions_created_at ON public.suggestions (created_at DESC);
CREATE INDEX idx_suggestions_vote_count ON public.suggestions (vote_count DESC);

CREATE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Votes
CREATE TABLE public.suggestion_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES public.suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (suggestion_id, user_id)
);

ALTER TABLE public.suggestion_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view votes"
  ON public.suggestion_votes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can vote"
  ON public.suggestion_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own vote"
  ON public.suggestion_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Maintain vote_count on suggestions automatically
CREATE OR REPLACE FUNCTION public.update_suggestion_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.suggestions
      SET vote_count = vote_count + 1
      WHERE id = NEW.suggestion_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.suggestions
      SET vote_count = GREATEST(0, vote_count - 1)
      WHERE id = OLD.suggestion_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER suggestion_votes_count_trigger
  AFTER INSERT OR DELETE ON public.suggestion_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_suggestion_vote_count();
