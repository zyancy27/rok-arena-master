-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create battle_status enum
CREATE TYPE public.battle_status AS ENUM ('pending', 'active', 'completed');

-- Create message_channel enum
CREATE TYPE public.message_channel AS ENUM ('in_universe', 'out_of_universe');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create characters table
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 7),
  lore TEXT,
  powers TEXT,
  abilities TEXT,
  home_planet TEXT,
  race TEXT,
  sub_race TEXT,
  age INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create battles table
CREATE TABLE public.battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status battle_status NOT NULL DEFAULT 'pending',
  winner_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  loser_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create battle_participants table
CREATE TABLE public.battle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  turn_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (battle_id, character_id)
);

-- Create battle_messages table
CREATE TABLE public.battle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  channel message_channel NOT NULL DEFAULT 'in_universe',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_messages ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user has admin or moderator role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function: Check if current user is admin or moderator
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
  )
$$;

-- Helper function: Check if current user owns a character
CREATE OR REPLACE FUNCTION public.is_character_owner(_character_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.characters
    WHERE id = _character_id
      AND user_id = auth.uid()
  )
$$;

-- Helper function: Check if current user is a participant in a battle
CREATE OR REPLACE FUNCTION public.is_battle_participant(_battle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.battle_participants bp
    JOIN public.characters c ON bp.character_id = c.id
    WHERE bp.battle_id = _battle_id
      AND c.user_id = auth.uid()
  )
$$;

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_battles_updated_at
  BEFORE UPDATE ON public.battles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin_or_moderator());

-- RLS Policies for profiles
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin_or_moderator());

-- RLS Policies for characters
CREATE POLICY "Anyone can view all characters"
  ON public.characters FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own characters"
  ON public.characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own characters"
  ON public.characters FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin_or_moderator());

CREATE POLICY "Users can delete their own characters"
  ON public.characters FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin_or_moderator());

-- RLS Policies for battles
CREATE POLICY "Participants can view their battles"
  ON public.battles FOR SELECT
  USING (public.is_battle_participant(id) OR public.is_admin_or_moderator());

CREATE POLICY "Authenticated users can create battles"
  ON public.battles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants and admins can update battles"
  ON public.battles FOR UPDATE
  USING (public.is_battle_participant(id) OR public.is_admin_or_moderator());

CREATE POLICY "Admins can delete battles"
  ON public.battles FOR DELETE
  USING (public.is_admin_or_moderator());

-- RLS Policies for battle_participants
CREATE POLICY "Participants can view battle participants"
  ON public.battle_participants FOR SELECT
  USING (public.is_battle_participant(battle_id) OR public.is_admin_or_moderator());

CREATE POLICY "Users can add their own characters to battles"
  ON public.battle_participants FOR INSERT
  WITH CHECK (public.is_character_owner(character_id) OR public.is_admin_or_moderator());

CREATE POLICY "Admins can manage battle participants"
  ON public.battle_participants FOR ALL
  USING (public.is_admin_or_moderator());

-- RLS Policies for battle_messages
CREATE POLICY "Participants can view battle messages"
  ON public.battle_messages FOR SELECT
  USING (public.is_battle_participant(battle_id) OR public.is_admin_or_moderator());

CREATE POLICY "Participants can send messages"
  ON public.battle_messages FOR INSERT
  WITH CHECK (
    public.is_battle_participant(battle_id) 
    AND public.is_character_owner(character_id)
  );

CREATE POLICY "Admins can manage all messages"
  ON public.battle_messages FOR ALL
  USING (public.is_admin_or_moderator());

-- Enable realtime for battle_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_messages;

-- Create indexes for performance
CREATE INDEX idx_characters_user_id ON public.characters(user_id);
CREATE INDEX idx_battle_participants_battle_id ON public.battle_participants(battle_id);
CREATE INDEX idx_battle_participants_character_id ON public.battle_participants(character_id);
CREATE INDEX idx_battle_messages_battle_id ON public.battle_messages(battle_id);
CREATE INDEX idx_battle_messages_channel ON public.battle_messages(channel);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);