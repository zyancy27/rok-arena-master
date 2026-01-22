import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getTierName, getTierColor } from '@/lib/game-constants';
import { Sparkles } from 'lucide-react';

interface CharacterCardProps {
  id: string;
  name: string;
  level: number;
  race: string | null;
  home_planet: string | null;
  image_url?: string | null;
  username?: string;
  showOwner?: boolean;
}

export default function CharacterCard({
  id,
  name,
  level,
  race,
  home_planet,
  image_url,
  username,
  showOwner = false,
}: CharacterCardProps) {
  return (
    <Link to={`/characters/${id}`}>
      <Card className="bg-card-gradient border-border hover:glow-primary transition-all duration-300 cursor-pointer group h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <Avatar className="h-16 w-16 border-2 border-primary/30 group-hover:border-primary/60 transition-colors">
              <AvatarImage src={image_url || undefined} alt={name} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Badge className={`${getTierColor(level)} tier-badge`}>
              <Sparkles className="w-3 h-3 mr-1" />
              Tier {level}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {getTierName(level)}
          </p>
          {race && (
            <p className="text-sm text-muted-foreground">
              <span className="text-accent">{race}</span>
              {home_planet && ` from ${home_planet}`}
            </p>
          )}
          {showOwner && username && (
            <p className="text-xs text-muted-foreground mt-2">
              Created by <span className="text-primary">{username}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
