import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Sparkles, Zap, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GiantCharacterData {
  id: string;
  name: string;
  level: number;
  race: string | null;
  orbitRadius: number;
  size: number;
  color: string;
  isMale: boolean;
}

interface MobileGiantCharacterDetailsProps {
  character: GiantCharacterData | null;
  isOpen: boolean;
  onClose: () => void;
}

function getTierInfo(level: number): { name: string; description: string; icon: React.ReactNode } {
  switch (level) {
    case 4:
      return { 
        name: 'God Tier', 
        description: 'Celestial beings with power over reality itself',
        icon: <Crown className="w-4 h-4" />
      };
    case 5:
      return { 
        name: 'Titan Tier', 
        description: 'Primordial entities that shaped the cosmos',
        icon: <Sparkles className="w-4 h-4" />
      };
    case 6:
      return { 
        name: 'Logic Bender', 
        description: 'Beings that can alter the fundamental laws of existence',
        icon: <Zap className="w-4 h-4" />
      };
    case 7:
      return { 
        name: 'Paradox Tier', 
        description: 'Existence itself bends around their will',
        icon: <Sparkles className="w-4 h-4" />
      };
    default:
      return { 
        name: `Tier ${level}`, 
        description: 'Cosmic-level entity',
        icon: <Sparkles className="w-4 h-4" />
      };
  }
}

function getSizeDescription(size: number): string {
  if (size >= 2.5) return 'Galaxy-sized';
  if (size >= 2) return 'Star-sized';
  if (size >= 1.5) return 'Planet-sized';
  return 'Moon-sized';
}

export default function MobileGiantCharacterDetails({
  character,
  isOpen,
  onClose,
}: MobileGiantCharacterDetailsProps) {
  if (!character) return null;

  const tierInfo = getTierInfo(character.level);
  const sizeDesc = getSizeDescription(character.size);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            {/* Character energy indicator */}
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ 
                background: `radial-gradient(circle, ${character.color}60, ${character.color}20)`,
                boxShadow: `0 0 20px ${character.color}60`,
                border: `2px solid ${character.color}`
              }}
            >
              {tierInfo.icon}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{character.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge 
                  className="text-xs"
                  style={{ 
                    backgroundColor: `${character.color}30`,
                    color: character.color,
                    border: `1px solid ${character.color}60`
                  }}
                >
                  {tierInfo.name}
                </Badge>
                {character.race && (
                  <Badge variant="outline" className="text-xs">
                    {character.race}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Character Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Power Tier */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Zap className="w-3 h-3" />
              Power Level
            </div>
            <div className="font-semibold" style={{ color: character.color }}>
              Tier {character.level}
            </div>
          </div>

          {/* Cosmic Size */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Sparkles className="w-3 h-3" />
              Cosmic Scale
            </div>
            <div className="font-semibold">
              {sizeDesc}
            </div>
          </div>

          {/* Race */}
          {character.race && (
            <div className="bg-muted/50 rounded-lg p-3 col-span-2">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                Race
              </div>
              <div className="font-semibold">
                {character.race}
              </div>
            </div>
          )}
        </div>

        {/* Tier Description */}
        <div className="mb-4 p-3 rounded-lg border" style={{ borderColor: `${character.color}40` }}>
          <p className="text-sm text-muted-foreground">
            {tierInfo.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <Button 
            asChild
            className="w-full"
            variant="default"
          >
            <Link to={`/characters/${character.id}`} onClick={onClose}>
              <Eye className="w-4 h-4 mr-2" />
              View Full Profile
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
