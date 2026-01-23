import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Settings, ArrowLeft, Plus } from 'lucide-react';

interface PlanetMenuProps {
  planetName: string;
  characterCount: number;
  onViewCharacters: () => void;
  onEditPlanet: () => void;
  onBack: () => void;
}

export default function PlanetMenu({
  planetName,
  characterCount,
  onViewCharacters,
  onEditPlanet,
  onBack,
}: PlanetMenuProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
      <Card className="bg-card/95 backdrop-blur-md border-primary/30 w-80 pointer-events-auto animate-scale-in">
        <CardHeader className="pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-2"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <CardTitle className="text-center pt-6 text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {planetName}
          </CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            {characterCount} character{characterCount !== 1 ? 's' : ''} residing here
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <Button
            className="w-full h-14 text-lg gap-3"
            onClick={onViewCharacters}
          >
            <Users className="w-5 h-5" />
            View Characters
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 gap-3"
            onClick={onEditPlanet}
          >
            <Settings className="w-4 h-4" />
            Edit Planet Info
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
