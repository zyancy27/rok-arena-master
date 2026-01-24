import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Eye, Pencil, Trash2, Thermometer, Scale, Globe, Sparkles } from 'lucide-react';
import { getGravityClass } from '@/lib/planet-physics';

interface PlanetData {
  name: string;
  displayName: string;
  description: string;
  color: string;
  orbitRadius: number;
  planetSize: number;
  characterCount: number;
  hasRings: boolean | null;
  moonCount: number | null;
  gravity: number | null;
  radius: number | null;
  isUserCreated?: boolean;
}

interface MobilePlanetDetailsProps {
  planet: PlanetData | null;
  isOpen: boolean;
  onClose: () => void;
  onViewCharacters: () => void;
  onEditPlanet: () => void;
  onDeletePlanet: () => void;
  sunTemperature: number;
  sunLuminosity: number;
  canEdit: boolean;
}

// Calculate planet temperature based on distance and sun luminosity
function calculatePlanetTemperature(orbitRadius: number, sunLuminosity: number): number {
  const baseTemp = 288;
  const distanceRatio = orbitRadius / 5;
  return Math.round(baseTemp * Math.pow(sunLuminosity, 0.25) / Math.pow(distanceRatio, 0.5));
}

function getClimateZone(temperature: number): { name: string; color: string; emoji: string } {
  if (temperature > 400) return { name: 'Scorched', color: '#EF4444', emoji: '🔥' };
  if (temperature > 320) return { name: 'Hot', color: '#F97316', emoji: '☀️' };
  if (temperature >= 250 && temperature <= 310) return { name: 'Temperate', color: '#22C55E', emoji: '🌱' };
  if (temperature >= 200) return { name: 'Cold', color: '#3B82F6', emoji: '❄️' };
  return { name: 'Frozen', color: '#06B6D4', emoji: '🧊' };
}

export default function MobilePlanetDetails({
  planet,
  isOpen,
  onClose,
  onViewCharacters,
  onEditPlanet,
  onDeletePlanet,
  sunTemperature,
  sunLuminosity,
  canEdit,
}: MobilePlanetDetailsProps) {
  if (!planet) return null;

  const temperature = calculatePlanetTemperature(planet.orbitRadius, sunLuminosity);
  const climate = getClimateZone(temperature);
  const gravityInfo = planet.gravity ? getGravityClass(planet.gravity) : null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            {/* Planet color indicator */}
            <div 
              className="w-12 h-12 rounded-full shadow-lg flex-shrink-0"
              style={{ 
                backgroundColor: planet.color,
                boxShadow: `0 0 20px ${planet.color}40`
              }}
            />
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{planet.displayName}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {planet.characterCount} character{planet.characterCount !== 1 ? 's' : ''}
                </Badge>
                {planet.hasRings && (
                  <Badge variant="secondary" className="text-xs">Ringed</Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Planet Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Temperature */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Thermometer className="w-3 h-3" />
              Temperature
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">~{temperature}K</span>
              <span style={{ color: climate.color }}>{climate.emoji} {climate.name}</span>
            </div>
          </div>

          {/* Gravity */}
          {gravityInfo && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Scale className="w-3 h-3" />
                Gravity
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{planet.gravity?.toFixed(1)}g</span>
                <span style={{ color: gravityInfo.color }}>{gravityInfo.name}</span>
              </div>
            </div>
          )}

          {/* Size */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Globe className="w-3 h-3" />
              Size
            </div>
            <div className="font-semibold">
              {planet.radius ? `${planet.radius.toFixed(1)}x Earth` : `${(planet.planetSize / 0.6).toFixed(1)}x`}
            </div>
          </div>

          {/* Moons */}
          {planet.moonCount !== null && planet.moonCount > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Sparkles className="w-3 h-3" />
                Moons
              </div>
              <div className="font-semibold">
                {planet.moonCount} moon{planet.moonCount !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {planet.description && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Description</h4>
            <p className="text-sm leading-relaxed">{planet.description}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <Button 
            onClick={() => {
              onViewCharacters();
              onClose();
            }}
            className="w-full"
            variant="default"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Characters ({planet.characterCount})
          </Button>
          
          {canEdit && (
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  onEditPlanet();
                  onClose();
                }}
                className="flex-1"
                variant="outline"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Planet
              </Button>
              
              {planet.isUserCreated && (
                <Button 
                  onClick={() => {
                    onDeletePlanet();
                    onClose();
                  }}
                  variant="destructive"
                  size="icon"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
