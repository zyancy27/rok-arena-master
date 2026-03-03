
-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Secure encryption config table
CREATE TABLE IF NOT EXISTS public.encryption_config (
  id int PRIMARY KEY DEFAULT 1,
  encryption_key text NOT NULL
);
ALTER TABLE public.encryption_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.encryption_config (id, encryption_key)
VALUES (1, encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (id) DO NOTHING;

-- Encrypt function using extensions schema
CREATE OR REPLACE FUNCTION public.encrypt_field(plain_text text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _key text;
BEGIN
  IF plain_text IS NULL THEN RETURN NULL; END IF;
  IF left(plain_text, 4) = 'ENC:' THEN RETURN plain_text; END IF;
  SELECT encryption_key INTO _key FROM public.encryption_config WHERE id = 1;
  RETURN 'ENC:' || encode(pgp_sym_encrypt(plain_text, _key), 'base64');
END;
$$;

-- Decrypt function
CREATE OR REPLACE FUNCTION public.decrypt_field(encrypted_text text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE _key text;
BEGIN
  IF encrypted_text IS NULL THEN RETURN NULL; END IF;
  IF left(encrypted_text, 4) != 'ENC:' THEN RETURN encrypted_text; END IF;
  SELECT encryption_key INTO _key FROM public.encryption_config WHERE id = 1;
  RETURN pgp_sym_decrypt(decode(substring(encrypted_text from 5), 'base64'), _key);
EXCEPTION WHEN OTHERS THEN RETURN encrypted_text;
END;
$$;

-- Characters trigger
CREATE OR REPLACE FUNCTION public.encrypt_characters_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.lore = encrypt_field(NEW.lore);
  NEW.powers = encrypt_field(NEW.powers);
  NEW.abilities = encrypt_field(NEW.abilities);
  NEW.personality = encrypt_field(NEW.personality);
  NEW.mentality = encrypt_field(NEW.mentality);
  NEW.weapons_items = encrypt_field(NEW.weapons_items);
  RETURN NEW;
END;
$$;
CREATE TRIGGER encrypt_characters_before_write BEFORE INSERT OR UPDATE ON public.characters FOR EACH ROW EXECUTE FUNCTION public.encrypt_characters_trigger();

-- Stories trigger
CREATE OR REPLACE FUNCTION public.encrypt_stories_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.content = encrypt_field(NEW.content);
  NEW.summary = encrypt_field(NEW.summary);
  RETURN NEW;
END;
$$;
CREATE TRIGGER encrypt_stories_before_write BEFORE INSERT OR UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.encrypt_stories_trigger();

-- Story chapters trigger
CREATE OR REPLACE FUNCTION public.encrypt_story_chapters_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.content = encrypt_field(NEW.content);
  RETURN NEW;
END;
$$;
CREATE TRIGGER encrypt_story_chapters_before_write BEFORE INSERT OR UPDATE ON public.story_chapters FOR EACH ROW EXECUTE FUNCTION public.encrypt_story_chapters_trigger();

-- Character sections trigger
CREATE OR REPLACE FUNCTION public.encrypt_character_sections_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.body = encrypt_field(NEW.body);
  RETURN NEW;
END;
$$;
CREATE TRIGGER encrypt_character_sections_before_write BEFORE INSERT OR UPDATE ON public.character_sections FOR EACH ROW EXECUTE FUNCTION public.encrypt_character_sections_trigger();

-- Character AI notes trigger
CREATE OR REPLACE FUNCTION public.encrypt_character_ai_notes_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.note = encrypt_field(NEW.note);
  RETURN NEW;
END;
$$;
CREATE TRIGGER encrypt_character_ai_notes_before_write BEFORE INSERT OR UPDATE ON public.character_ai_notes FOR EACH ROW EXECUTE FUNCTION public.encrypt_character_ai_notes_trigger();

-- Character constructs trigger
CREATE OR REPLACE FUNCTION public.encrypt_character_constructs_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.behavior_summary = encrypt_field(NEW.behavior_summary);
  NEW.limitations = encrypt_field(NEW.limitations);
  RETURN NEW;
END;
$$;
CREATE TRIGGER encrypt_character_constructs_before_write BEFORE INSERT OR UPDATE ON public.character_constructs FOR EACH ROW EXECUTE FUNCTION public.encrypt_character_constructs_trigger();

-- Races trigger
CREATE OR REPLACE FUNCTION public.encrypt_races_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.description = encrypt_field(NEW.description);
  NEW.typical_abilities = encrypt_field(NEW.typical_abilities);
  NEW.typical_physiology = encrypt_field(NEW.typical_physiology);
  NEW.cultural_traits = encrypt_field(NEW.cultural_traits);
  RETURN NEW;
END;
$$;
CREATE TRIGGER encrypt_races_before_write BEFORE INSERT OR UPDATE ON public.races FOR EACH ROW EXECUTE FUNCTION public.encrypt_races_trigger();

-- Sub-races trigger
CREATE OR REPLACE FUNCTION public.encrypt_sub_races_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.description = encrypt_field(NEW.description);
  NEW.typical_abilities = encrypt_field(NEW.typical_abilities);
  NEW.typical_physiology = encrypt_field(NEW.typical_physiology);
  NEW.cultural_traits = encrypt_field(NEW.cultural_traits);
  RETURN NEW;
END;
$$;
CREATE TRIGGER encrypt_sub_races_before_write BEFORE INSERT OR UPDATE ON public.sub_races FOR EACH ROW EXECUTE FUNCTION public.encrypt_sub_races_trigger();

-- Decrypted views
DROP VIEW IF EXISTS public.characters_decrypted;
CREATE VIEW public.characters_decrypted WITH (security_invoker = on) AS
SELECT id, user_id, level, age, created_at, updated_at, name, race, sub_race, home_planet, home_moon, image_url, race_id, solar_system_id, stat_intelligence, stat_strength, stat_power, stat_speed, stat_durability, stat_stamina, stat_skill, stat_luck, stat_battle_iq,
  decrypt_field(lore) as lore, decrypt_field(powers) as powers, decrypt_field(abilities) as abilities,
  decrypt_field(personality) as personality, decrypt_field(mentality) as mentality, decrypt_field(weapons_items) as weapons_items
FROM public.characters;

DROP VIEW IF EXISTS public.stories_decrypted;
CREATE VIEW public.stories_decrypted WITH (security_invoker = on) AS
SELECT id, user_id, character_id, is_published, created_at, updated_at, title,
  decrypt_field(content) as content, decrypt_field(summary) as summary
FROM public.stories;

DROP VIEW IF EXISTS public.story_chapters_decrypted;
CREATE VIEW public.story_chapters_decrypted WITH (security_invoker = on) AS
SELECT id, story_id, chapter_number, created_at, updated_at, title, decrypt_field(content) as content
FROM public.story_chapters;

DROP VIEW IF EXISTS public.character_sections_decrypted;
CREATE VIEW public.character_sections_decrypted WITH (security_invoker = on) AS
SELECT id, character_id, user_id, sort_order, created_at, updated_at, title, decrypt_field(body) as body
FROM public.character_sections;

DROP VIEW IF EXISTS public.character_ai_notes_decrypted;
CREATE VIEW public.character_ai_notes_decrypted WITH (security_invoker = on) AS
SELECT id, character_id, user_id, battle_id, created_at, updated_at, category, scope, decrypt_field(note) as note
FROM public.character_ai_notes;

DROP VIEW IF EXISTS public.character_constructs_decrypted;
CREATE VIEW public.character_constructs_decrypted WITH (security_invoker = on) AS
SELECT id, character_id, user_id, durability_numeric, created_at, updated_at, name, construct_type, persistence, durability_level,
  decrypt_field(behavior_summary) as behavior_summary, decrypt_field(limitations) as limitations
FROM public.character_constructs;

DROP VIEW IF EXISTS public.races_decrypted;
CREATE VIEW public.races_decrypted WITH (security_invoker = on) AS
SELECT id, user_id, created_at, updated_at, name, home_planet, image_url, average_lifespan,
  decrypt_field(description) as description, decrypt_field(typical_abilities) as typical_abilities,
  decrypt_field(typical_physiology) as typical_physiology, decrypt_field(cultural_traits) as cultural_traits
FROM public.races;

DROP VIEW IF EXISTS public.sub_races_decrypted;
CREATE VIEW public.sub_races_decrypted WITH (security_invoker = on) AS
SELECT id, race_id, user_id, created_at, updated_at, name,
  decrypt_field(description) as description, decrypt_field(typical_abilities) as typical_abilities,
  decrypt_field(typical_physiology) as typical_physiology, decrypt_field(cultural_traits) as cultural_traits
FROM public.sub_races;

-- Encrypt existing data (triggers handle the encryption)
UPDATE public.characters SET lore = lore WHERE lore IS NOT NULL;
UPDATE public.characters SET powers = powers WHERE powers IS NOT NULL;
UPDATE public.characters SET abilities = abilities WHERE abilities IS NOT NULL;
UPDATE public.characters SET personality = personality WHERE personality IS NOT NULL;
UPDATE public.characters SET mentality = mentality WHERE mentality IS NOT NULL;
UPDATE public.characters SET weapons_items = weapons_items WHERE weapons_items IS NOT NULL;
UPDATE public.stories SET content = content WHERE content IS NOT NULL;
UPDATE public.stories SET summary = summary WHERE summary IS NOT NULL;
UPDATE public.story_chapters SET content = content WHERE content IS NOT NULL;
UPDATE public.character_sections SET body = body WHERE body IS NOT NULL;
UPDATE public.character_ai_notes SET note = note WHERE note IS NOT NULL;
UPDATE public.character_constructs SET behavior_summary = behavior_summary WHERE behavior_summary IS NOT NULL;
UPDATE public.character_constructs SET limitations = limitations WHERE limitations IS NOT NULL;
UPDATE public.races SET description = description WHERE description IS NOT NULL;
UPDATE public.races SET typical_abilities = typical_abilities WHERE typical_abilities IS NOT NULL;
UPDATE public.races SET typical_physiology = typical_physiology WHERE typical_physiology IS NOT NULL;
UPDATE public.races SET cultural_traits = cultural_traits WHERE cultural_traits IS NOT NULL;
UPDATE public.sub_races SET description = description WHERE description IS NOT NULL;
UPDATE public.sub_races SET typical_abilities = typical_abilities WHERE typical_abilities IS NOT NULL;
UPDATE public.sub_races SET typical_physiology = typical_physiology WHERE typical_physiology IS NOT NULL;
UPDATE public.sub_races SET cultural_traits = cultural_traits WHERE cultural_traits IS NOT NULL;
