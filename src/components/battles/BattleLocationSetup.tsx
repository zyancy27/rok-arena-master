import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Coins, Sparkles, Shuffle } from 'lucide-react';
import { generateRandomLocation } from '@/lib/random-location-generator';
import { analyzeLocation, buildThemeFromLocation, type EnvironmentTag } from '@/lib/theme-engine';

interface BattleLocationSetupProps {
  location1: string | null;
  location2: string | null;
  chosenLocation: string | null;
  coinFlipWinnerId: string | null;
  onSetLocation: (location: string) => Promise<void>;
  onFlipCoin: () => Promise<void>;
  isUserTurn: boolean;
  canFlipCoin: boolean;
  participant1Name: string;
  participant2Name: string;
}

export default function BattleLocationSetup({
  location1,
  location2,
  chosenLocation,
  coinFlipWinnerId,
  onSetLocation,
  onFlipCoin,
  isUserTurn,
  canFlipCoin,
  participant1Name,
  participant2Name,
}: BattleLocationSetupProps) {
  const [locationInput, setLocationInput] = useState('');
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null);

  const handleSetLocation = async () => {
    if (!locationInput.trim()) return;
    await onSetLocation(locationInput.trim());
    setLocationInput('');
  };

  const handleFlipCoin = async () => {
    setIsFlipping(true);
    setCoinResult(null);
    
    // Animate coin flip
    await new Promise(resolve => setTimeout(resolve, 1500));
    const result = Math.random() > 0.5 ? 'heads' : 'tails';
    setCoinResult(result);
    
    await onFlipCoin();
    setIsFlipping(false);
  };

  if (chosenLocation) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Battle Location</p>
              <p className="font-semibold text-lg">{chosenLocation}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card-gradient border-border">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Battle Location Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location submissions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{participant1Name}'s Location</Label>
            {location1 ? (
              <Badge variant="outline" className="w-full justify-start gap-2 py-2">
                <Sparkles className="w-3 h-3" />
                {location1}
              </Badge>
            ) : (
              <Badge variant="secondary" className="w-full justify-start py-2 text-muted-foreground">
                Awaiting submission...
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{participant2Name}'s Location</Label>
            {location2 ? (
              <Badge variant="outline" className="w-full justify-start gap-2 py-2">
                <Sparkles className="w-3 h-3" />
                {location2}
              </Badge>
            ) : (
              <Badge variant="secondary" className="w-full justify-start py-2 text-muted-foreground">
                Awaiting submission...
              </Badge>
            )}
          </div>
        </div>

        {/* Input for user to set their location */}
        {isUserTurn && !location1 && !location2 && (
          <div className="space-y-2">
            <Label>Enter Your Battle Location</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Volcanic Mountains, Crystal Caverns..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSetLocation()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLocationInput(generateRandomLocation())}
                title="Generate random location"
                className="shrink-0"
              >
                <Shuffle className="w-4 h-4" />
              </Button>
              <Button onClick={handleSetLocation} disabled={!locationInput.trim()}>
                Submit
              </Button>
            </div>
            {/* Theme tag preview */}
            <LocationTagPreview location={locationInput} />
          </div>
        )}

        {/* Coin flip */}
        {canFlipCoin && location1 && location2 && !chosenLocation && (
          <div className="text-center space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Both locations submitted! Flip the coin to decide the battle arena.
            </p>
            
            {isFlipping && (
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 animate-spin flex items-center justify-center shadow-lg">
                  <Coins className="w-8 h-8 text-amber-900" />
                </div>
              </div>
            )}
            
            {coinResult && !isFlipping && (
              <Badge className="text-lg py-2 px-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900">
                {coinResult.toUpperCase()}!
              </Badge>
            )}
            
            {!isFlipping && (
              <Button 
                onClick={handleFlipCoin}
                className="glow-primary"
                size="lg"
              >
                <Coins className="w-5 h-5 mr-2" />
                Flip Coin
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Inline preview of detected theme tags for a location string */
function LocationTagPreview({ location }: { location: string }) {
  const tags = useMemo(() => analyzeLocation(location), [location]);

  if (!location.trim() || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Theme:</span>
      {tags.map((tag) => (
        <Badge key={tag} variant="outline" className="text-[10px] py-0 h-5">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
