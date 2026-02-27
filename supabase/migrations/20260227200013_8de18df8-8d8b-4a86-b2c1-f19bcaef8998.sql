
-- Campaign NPCs: persistent named characters in a campaign world
CREATE TABLE public.campaign_npcs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'civilian',
  personality text,
  appearance text,
  current_zone text,
  backstory text,
  status text NOT NULL DEFAULT 'alive',
  first_met_day integer NOT NULL DEFAULT 1,
  last_seen_day integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- NPC-Character relationships: how each player character relates to each NPC
CREATE TABLE public.npc_relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  npc_id uuid NOT NULL REFERENCES public.campaign_npcs(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  disposition text NOT NULL DEFAULT 'neutral',
  trust_level integer NOT NULL DEFAULT 0,
  notes text,
  last_interaction_day integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(npc_id, character_id)
);

-- RLS for campaign_npcs
ALTER TABLE public.campaign_npcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members can view NPCs"
  ON public.campaign_npcs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_participants cp
      WHERE cp.campaign_id = campaign_npcs.campaign_id AND cp.user_id = auth.uid()
    ) OR is_admin_or_moderator()
  );

CREATE POLICY "Campaign creator can manage NPCs"
  ON public.campaign_npcs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_npcs.campaign_id AND c.creator_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.campaign_participants cp
      WHERE cp.campaign_id = campaign_npcs.campaign_id AND cp.user_id = auth.uid() AND cp.is_active = true
    )
  );

CREATE POLICY "Campaign members can update NPCs"
  ON public.campaign_npcs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_participants cp
      WHERE cp.campaign_id = campaign_npcs.campaign_id AND cp.user_id = auth.uid() AND cp.is_active = true
    ) OR is_admin_or_moderator()
  );

CREATE POLICY "Campaign creator can delete NPCs"
  ON public.campaign_npcs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_npcs.campaign_id AND c.creator_id = auth.uid()
    ) OR is_admin_or_moderator()
  );

-- RLS for npc_relationships
ALTER TABLE public.npc_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members can view relationships"
  ON public.npc_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_participants cp
      WHERE cp.campaign_id = npc_relationships.campaign_id AND cp.user_id = auth.uid()
    ) OR is_admin_or_moderator()
  );

CREATE POLICY "Campaign members can create relationships"
  ON public.npc_relationships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaign_participants cp
      WHERE cp.campaign_id = npc_relationships.campaign_id AND cp.user_id = auth.uid() AND cp.is_active = true
    )
  );

CREATE POLICY "Campaign members can update relationships"
  ON public.npc_relationships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_participants cp
      WHERE cp.campaign_id = npc_relationships.campaign_id AND cp.user_id = auth.uid() AND cp.is_active = true
    )
  );

CREATE POLICY "Campaign members can delete relationships"
  ON public.npc_relationships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_participants cp
      WHERE cp.campaign_id = npc_relationships.campaign_id AND cp.user_id = auth.uid() AND cp.is_active = true
    )
  );

-- Updated_at triggers
CREATE TRIGGER update_campaign_npcs_updated_at
  BEFORE UPDATE ON public.campaign_npcs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_npc_relationships_updated_at
  BEFORE UPDATE ON public.npc_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
