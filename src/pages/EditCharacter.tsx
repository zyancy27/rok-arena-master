import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import CharacterForm from '@/components/characters/CharacterForm';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Swords } from 'lucide-react';

interface CharacterData {
  id: string;
  name: string;
  level: number;
  lore: string;
  powers: string;
  abilities: string;
  home_planet: string;
  home_moon: string;
  race: string;
  sub_race: string;
  age: string;
  image_url: string;
  user_id: string;
  personality: string;
  mentality: string;
  stat_intelligence?: number;
  stat_strength?: number;
  stat_power?: number;
  stat_speed?: number;
  stat_durability?: number;
  stat_stamina?: number;
  stat_skill?: number;
  stat_luck?: number;
}

export default function EditCharacter() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCharacter();
    }
  }, [id]);

  const fetchCharacter = async () => {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast.error('Character not found');
      navigate('/hub');
      return;
    }

    // Check ownership
    if (data.user_id !== user?.id) {
      toast.error('You can only edit your own characters');
      navigate('/hub');
      return;
    }

    setCharacter({
      ...data,
      lore: data.lore || '',
      powers: data.powers || '',
      abilities: data.abilities || '',
      home_planet: data.home_planet || '',
      home_moon: data.home_moon || '',
      race: data.race || '',
      sub_race: data.sub_race || '',
      age: data.age?.toString() || '',
      image_url: data.image_url || '',
      personality: data.personality || '',
      mentality: data.mentality || '',
      stat_intelligence: data.stat_intelligence ?? 50,
      stat_strength: data.stat_strength ?? 50,
      stat_power: data.stat_power ?? 50,
      stat_speed: data.stat_speed ?? 50,
      stat_durability: data.stat_durability ?? 50,
      stat_stamina: data.stat_stamina ?? 50,
      stat_skill: data.stat_skill ?? 50,
      stat_luck: data.stat_luck ?? 50,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse-glow">
          <Swords className="w-16 h-16 text-primary" />
        </div>
      </div>
    );
  }

  if (!character) return null;

  return <CharacterForm mode="edit" initialData={character} />;
}
