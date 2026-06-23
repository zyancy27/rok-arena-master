
-- ============ Enums ============
DO $$ BEGIN
  CREATE TYPE public.conversation_type AS ENUM ('direct', 'group');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.conversation_role AS ENUM ('member', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ conversations ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.conversation_type NOT NULL DEFAULT 'direct',
  name text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ============ conversation_participants ============
CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.conversation_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  muted boolean NOT NULL DEFAULT false,
  UNIQUE (conversation_id, user_id)
);
CREATE INDEX idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX idx_conv_participants_conv ON public.conversation_participants(conversation_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- ============ messages ============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
CREATE INDEX idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============ Helper: is_conversation_member ============
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_admin(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

-- ============ Helper: can_message ============
CREATE OR REPLACE FUNCTION public.can_message(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    _user_a = _user_b
    OR EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = _user_a AND f.addressee_id = _user_b)
          OR (f.requester_id = _user_b AND f.addressee_id = _user_a)
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.battle_participants bp1
      JOIN public.characters c1 ON c1.id = bp1.character_id
      JOIN public.battle_participants bp2 ON bp2.battle_id = bp1.battle_id
      JOIN public.characters c2 ON c2.id = bp2.character_id
      WHERE c1.user_id = _user_a AND c2.user_id = _user_b
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaign_participants cp1
      JOIN public.campaign_participants cp2 ON cp1.campaign_id = cp2.campaign_id
      WHERE cp1.user_id = _user_a AND cp2.user_id = _user_b
    );
$$;

-- ============ Encryption trigger for messages.body ============
CREATE OR REPLACE FUNCTION public.encrypt_messages_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.body = encrypt_field(NEW.body);
  RETURN NEW;
END $$;

CREATE TRIGGER encrypt_messages
BEFORE INSERT OR UPDATE OF body ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.encrypt_messages_trigger();

-- ============ Decrypted view ============
CREATE OR REPLACE VIEW public.messages_decrypted
WITH (security_invoker = on) AS
SELECT
  id, conversation_id, sender_id,
  decrypt_field(body) AS body,
  created_at, edited_at, deleted_at
FROM public.messages;
GRANT SELECT ON public.messages_decrypted TO authenticated;

-- ============ Bump last_message_at on insert ============
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _preview text;
BEGIN
  _preview := left(coalesce(decrypt_field(NEW.body), ''), 120);
  UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = _preview,
        updated_at = now()
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

CREATE TRIGGER bump_conversation_after_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS Policies ============

-- conversations
CREATE POLICY "Members can view conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_member(id));

CREATE POLICY "Authenticated can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update group conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (public.is_conversation_admin(id))
  WITH CHECK (public.is_conversation_admin(id));

-- conversation_participants
CREATE POLICY "Members view participants"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id));

-- Allow inserting yourself when you create a conversation, or admins adding others (with can_message check)
CREATE POLICY "Insert self or admin-add eligible member"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK (
    (user_id = auth.uid())
    OR (
      public.is_conversation_admin(conversation_id)
      AND public.can_message(auth.uid(), user_id)
    )
  );

CREATE POLICY "Update own participant row"
  ON public.conversation_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_conversation_admin(conversation_id))
  WITH CHECK (user_id = auth.uid() OR public.is_conversation_admin(conversation_id));

CREATE POLICY "Leave or admin remove"
  ON public.conversation_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_conversation_admin(conversation_id));

-- messages
CREATE POLICY "Members read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id));

CREATE POLICY "Members send their own messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id));

CREATE POLICY "Sender edits own messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Sender deletes own messages"
  ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- ============ RPC: start_direct_conversation ============
CREATE OR REPLACE FUNCTION public.start_direct_conversation(_other_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _conv_id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _other_user IS NULL OR _other_user = _me THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;
  IF NOT public.can_message(_me, _other_user) THEN
    RAISE EXCEPTION 'You can only message friends or people in your battles or campaigns';
  END IF;

  -- Find existing direct conversation with exactly these two members
  SELECT c.id INTO _conv_id
  FROM public.conversations c
  WHERE c.type = 'direct'
    AND EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = _me)
    AND EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = _other_user)
    AND (SELECT count(*) FROM public.conversation_participants p WHERE p.conversation_id = c.id) = 2
  LIMIT 1;

  IF _conv_id IS NOT NULL THEN RETURN _conv_id; END IF;

  INSERT INTO public.conversations (type, created_by) VALUES ('direct', _me) RETURNING id INTO _conv_id;
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (_conv_id, _me, 'member'), (_conv_id, _other_user, 'member');
  RETURN _conv_id;
END $$;

-- ============ RPC: create_group_conversation ============
CREATE OR REPLACE FUNCTION public.create_group_conversation(_name text, _member_ids uuid[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _conv_id uuid;
  _uid uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _name IS NULL OR btrim(_name) = '' THEN RAISE EXCEPTION 'Group name required'; END IF;
  IF _member_ids IS NULL OR array_length(_member_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one other member required';
  END IF;

  FOREACH _uid IN ARRAY _member_ids LOOP
    IF _uid <> _me AND NOT public.can_message(_me, _uid) THEN
      RAISE EXCEPTION 'Not eligible to message all members';
    END IF;
  END LOOP;

  INSERT INTO public.conversations (type, name, created_by)
    VALUES ('group', btrim(_name), _me) RETURNING id INTO _conv_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (_conv_id, _me, 'admin');

  FOREACH _uid IN ARRAY _member_ids LOOP
    IF _uid <> _me THEN
      INSERT INTO public.conversation_participants (conversation_id, user_id, role)
        VALUES (_conv_id, _uid, 'member')
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN _conv_id;
END $$;

-- ============ RPC: mark_conversation_read ============
CREATE OR REPLACE FUNCTION public.mark_conversation_read(_conversation_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.conversation_participants
    SET last_read_at = now()
    WHERE conversation_id = _conversation_id AND user_id = auth.uid();
$$;

-- ============ Realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
