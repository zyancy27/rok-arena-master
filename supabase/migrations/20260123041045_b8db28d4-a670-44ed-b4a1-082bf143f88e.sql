-- Create friendships table for friend requests and follows
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  is_follow BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

-- Create galaxy_customizations table for galaxy appearance
CREATE TABLE public.galaxy_customizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  background_type TEXT NOT NULL DEFAULT 'nebula_purple',
  galaxy_shape TEXT NOT NULL DEFAULT 'spiral',
  visual_effects JSONB DEFAULT '{"dust_clouds": false, "asteroid_belts": false, "cosmic_rays": true}'::jsonb,
  custom_colors JSONB DEFAULT '{"primary": "#8B5CF6", "secondary": "#1E1B4B"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galaxy_customizations ENABLE ROW LEVEL SECURITY;

-- Friendships policies
CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can create friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they're part of"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can delete their own requests or received requests"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Galaxy customizations policies
CREATE POLICY "Anyone can view galaxy customizations"
  ON public.galaxy_customizations FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own galaxy customization"
  ON public.galaxy_customizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own galaxy customization"
  ON public.galaxy_customizations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own galaxy customization"
  ON public.galaxy_customizations FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_galaxy_customizations_updated_at
  BEFORE UPDATE ON public.galaxy_customizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();