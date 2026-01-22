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
  race: string;
  sub_race: string;
  age: string;
  user_id: string;
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
      race: data.race || '',
      sub_race: data.sub_race || '',
      age: data.age?.toString() || '',
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
