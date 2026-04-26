-- Per-character, per-speaker nickname records earned through play.
-- Replaces the single `nickname` field on narrator_sentiments as the source of truth
-- (that field stays for backward compat / quick rendering, but origin/tone/source live here).

CREATE TABLE IF NOT EXISTS public.character_nicknames (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL,
  campaign_id     UUID,
  battle_id       UUID,
  nickname        TEXT NOT NULL,
  source_type     TEXT NOT NULL DEFAULT 'narrator',
    -- one of: ally | enemy | mentor | public | party | narrator | self | rumor
  source_name     TEXT,
  tone            TEXT NOT NULL DEFAULT 'neutral',
    -- one of: affectionate | respectful | teasing | mocking | feared | legendary | neutral | ironic
  reason          TEXT NOT NULL DEFAULT '',
  origin_event    TEXT,
  first_used_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_scene_ref TEXT,
  confidence      INTEGER NOT NULL DEFAULT 50
                   CHECK (confidence BETWEEN 0 AND 100),
  status          TEXT NOT NULL DEFAULT 'active',
    -- one of: active | retired | contested | replaced | rejected
  player_reaction TEXT NOT NULL DEFAULT 'unknown',
    -- one of: accepted | ignored | disliked | rejected | unknown
  is_public       BOOLEAN NOT NULL DEFAULT false,
  replaces_nickname_id UUID,
  usage_count     INTEGER NOT NULL DEFAULT 0,
  last_used_at    TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation triggers (cannot use CHECK with subqueries; keep enums tight here too).
CREATE OR REPLACE FUNCTION public.character_nicknames_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.source_type NOT IN ('ally','enemy','mentor','public','party','narrator','self','rumor') THEN
    RAISE EXCEPTION 'Invalid source_type: %', NEW.source_type;
  END IF;
  IF NEW.tone NOT IN ('affectionate','respectful','teasing','mocking','feared','legendary','neutral','ironic') THEN
    RAISE EXCEPTION 'Invalid tone: %', NEW.tone;
  END IF;
  IF NEW.status NOT IN ('active','retired','contested','replaced','rejected') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.player_reaction NOT IN ('accepted','ignored','disliked','rejected','unknown') THEN
    RAISE EXCEPTION 'Invalid player_reaction: %', NEW.player_reaction;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS character_nicknames_validate_trg ON public.character_nicknames;
CREATE TRIGGER character_nicknames_validate_trg
  BEFORE INSERT OR UPDATE ON public.character_nicknames
  FOR EACH ROW EXECUTE FUNCTION public.character_nicknames_validate();

DROP TRIGGER IF EXISTS character_nicknames_set_updated_at ON public.character_nicknames;
CREATE TRIGGER character_nicknames_set_updated_at
  BEFORE UPDATE ON public.character_nicknames
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_character_nicknames_character
  ON public.character_nicknames (character_id, status);
CREATE INDEX IF NOT EXISTS idx_character_nicknames_campaign
  ON public.character_nicknames (campaign_id);
CREATE INDEX IF NOT EXISTS idx_character_nicknames_active
  ON public.character_nicknames (character_id, source_type) WHERE status = 'active';

ALTER TABLE public.character_nicknames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Character owners view nicknames"
  ON public.character_nicknames FOR SELECT
  USING (public.is_character_owner(character_id) OR public.is_admin_or_moderator());

CREATE POLICY "Character owners insert nicknames"
  ON public.character_nicknames FOR INSERT
  WITH CHECK (public.is_character_owner(character_id) OR public.is_admin_or_moderator());

CREATE POLICY "Character owners update nicknames"
  ON public.character_nicknames FOR UPDATE
  USING (public.is_character_owner(character_id) OR public.is_admin_or_moderator());

CREATE POLICY "Character owners delete nicknames"
  ON public.character_nicknames FOR DELETE
  USING (public.is_character_owner(character_id) OR public.is_admin_or_moderator());