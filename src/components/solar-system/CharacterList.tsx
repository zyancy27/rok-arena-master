import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CharacterCard from '@/components/characters/CharacterCard';
import { ArrowLeft, Plus, Users } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  level: number;
  race: string | null;
  home_planet: string | null;
  user_id: string;
  username?: string;
}

interface CharacterListProps {
  planetName: string;
  characters: Character[];
  onBack: () => void;
  isUserOwned?: boolean;
}

export default function CharacterList({
  planetName,
  characters,
  onBack,
  isUserOwned = false,
}: CharacterListProps) {
  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-md overflow-auto animate-fade-in">
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Galaxy
            </Button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {planetName}
              </h1>
              <p className="text-muted-foreground text-sm">
                {characters.length} character{characters.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to={`/characters/new?planet=${encodeURIComponent(planetName)}`}>
              <Plus className="w-4 h-4 mr-2" />
              Add Character
            </Link>
          </Button>
        </div>

        {/* Character Grid */}
        {characters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                id={character.id}
                name={character.name}
                level={character.level}
                race={character.race}
                home_planet={character.home_planet}
                username={character.username}
                showOwner={!isUserOwned}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-card-gradient border-border">
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Characters Yet</h3>
              <p className="text-muted-foreground mb-4">
                This planet awaits its first inhabitants.
              </p>
              <Button asChild>
                <Link to={`/characters/new?planet=${encodeURIComponent(planetName)}`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Character
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
