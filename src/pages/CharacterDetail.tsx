import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import ChallengeModal from '@/components/battles/ChallengeModal';
import { toast } from 'sonner';
import { getTierName, getTierColor } from '@/lib/game-constants';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Swords,
  Sparkles,
  Globe,
  User,
  Calendar,
  BookOpen,
  Zap,
  Shield,
} from 'lucide-react';

interface CharacterData {
  id: string;
  user_id: string;
  name: string;
  level: number;
  lore: string | null;
  powers: string | null;
  abilities: string | null;
  home_planet: string | null;
  race: string | null;
  sub_race: string | null;
  age: number | null;
  created_at: string;
}

interface Profile {
  username: string;
  display_name: string | null;
}

interface Character extends CharacterData {
  profile?: Profile;
}

export default function CharacterDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [userCharacters, setUserCharacters] = useState<{ id: string; name: string; level: number }[]>([]);

  useEffect(() => {
    if (id) {
      fetchCharacter();
    }
    if (user) {
      fetchUserCharacters();
    }
  }, [id, user]);

  const fetchUserCharacters = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('characters')
      .select('id, name, level')
      .eq('user_id', user.id);
    if (data) setUserCharacters(data);
  };

  const fetchCharacter = async () => {
    // First fetch the character
    const { data: charData, error: charError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (charError || !charData) {
      toast.error(charError ? 'Failed to load character' : 'Character not found');
      navigate('/characters');
      return;
    }

    // Then fetch the profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', charData.user_id)
      .maybeSingle();

    setCharacter({
      ...charData,
      profile: profileData || undefined,
    });
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!character) return;

    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', character.id);

    if (error) {
      toast.error('Failed to delete character');
      return;
    }

    toast.success('Character deleted');
    navigate('/hub');
  };

  const isOwner = user?.id === character?.user_id;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse-glow">
          <Swords className="w-16 h-16 text-primary" />
        </div>
      </div>
    );
  }

  if (!character) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card className="bg-card-gradient border-border glow-primary">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-3xl">{character.name}</CardTitle>
                <Badge className={`${getTierColor(character.level)} tier-badge`}>
                  <Sparkles className="w-3 h-3 mr-1" />
                  Tier {character.level}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground">
                {getTierName(character.level)}
              </p>
              {character.profile && (
                <p className="text-sm text-muted-foreground">
                  Created by{' '}
                  <span className="text-primary">
                    {character.profile.display_name || character.profile.username}
                  </span>
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {!isOwner && userCharacters.length > 0 && (
                <Button className="glow-accent" onClick={() => setShowChallengeModal(true)}>
                  <Swords className="w-4 h-4 mr-2" />
                  Challenge
                </Button>
              )}
              {isOwner && (
                <>
                  <Button variant="outline" asChild>
                    <Link to={`/characters/${character.id}/edit`}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Character</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {character.name}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {character.race && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <User className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">Race</p>
                  <p className="font-medium">{character.race}</p>
                </div>
              </div>
            )}
            {character.sub_race && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <User className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">Sub-Race</p>
                  <p className="font-medium">{character.sub_race}</p>
                </div>
              </div>
            )}
            {character.home_planet && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Globe className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">Home Planet</p>
                  <p className="font-medium">{character.home_planet}</p>
                </div>
              </div>
            )}
            {character.age && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Calendar className="w-4 h-4 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">Age</p>
                  <p className="font-medium">{character.age}</p>
                </div>
              </div>
            )}
          </div>

          {/* Expandable Sections */}
          <Accordion type="multiple" className="space-y-2">
            {character.lore && (
              <AccordionItem value="lore" className="border-border">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Lore & Backstory
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                  {character.lore}
                </AccordionContent>
              </AccordionItem>
            )}

            {character.powers && (
              <AccordionItem value="powers" className="border-border">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cosmic-gold" />
                    Base Power
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                  {character.powers}
                </AccordionContent>
              </AccordionItem>
            )}

            {character.abilities && (
              <AccordionItem value="abilities" className="border-border">
                <AccordionTrigger className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-accent" />
                    Abilities & Techniques
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                  {character.abilities}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </CardContent>
      </Card>

      {/* Challenge Modal */}
      {character && (
        <ChallengeModal
          open={showChallengeModal}
          onOpenChange={setShowChallengeModal}
          targetCharacter={{
            id: character.id,
            name: character.name,
            level: character.level,
          }}
          userCharacters={userCharacters}
        />
      )}
    </div>
  );
}
