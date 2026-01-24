import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Eye, Rocket, Ship } from 'lucide-react';

interface VesselData {
  name: string;
  orbitRadius: number;
  orbitSpeed: number;
  size: number;
  color: string;
  characterCount: number;
  isFleet: boolean;
}

interface MobileSpaceshipDetailsProps {
  vessel: VesselData | null;
  isOpen: boolean;
  onClose: () => void;
  onViewCrew: () => void;
}

export default function MobileSpaceshipDetails({
  vessel,
  isOpen,
  onClose,
  onViewCrew,
}: MobileSpaceshipDetailsProps) {
  if (!vessel) return null;

  const VesselIcon = vessel.isFleet ? Ship : Rocket;
  const vesselType = vessel.isFleet ? 'Fleet' : 'Ship';

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            {/* Vessel icon indicator */}
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ 
                backgroundColor: `${vessel.color}20`,
                boxShadow: `0 0 20px ${vessel.color}40`,
                border: `2px solid ${vessel.color}`
              }}
            >
              <VesselIcon className="w-6 h-6" style={{ color: vessel.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">{vessel.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{ borderColor: vessel.color, color: vessel.color }}
                >
                  {vesselType}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {vessel.characterCount} crew
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Vessel Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Vessel Type */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <VesselIcon className="w-3 h-3" />
              Type
            </div>
            <div className="font-semibold">
              {vessel.isFleet ? 'Fleet Formation' : 'Single Vessel'}
            </div>
          </div>

          {/* Size */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Rocket className="w-3 h-3" />
              Size Class
            </div>
            <div className="font-semibold">
              {vessel.size >= 1.2 ? 'Capital' : vessel.size >= 0.9 ? 'Cruiser' : 'Frigate'}
            </div>
          </div>

          {/* Crew Count */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="w-3 h-3" />
              Crew
            </div>
            <div className="font-semibold">
              {vessel.characterCount} member{vessel.characterCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Orbital Speed */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              ⚡ Speed
            </div>
            <div className="font-semibold">
              {vessel.orbitSpeed > 0.3 ? 'Fast' : vessel.orbitSpeed > 0.2 ? 'Moderate' : 'Slow'}
            </div>
          </div>
        </div>

        {/* Fleet info */}
        {vessel.isFleet && (
          <div className="mb-4 p-3 rounded-lg border" style={{ borderColor: `${vessel.color}40` }}>
            <p className="text-sm text-muted-foreground">
              This fleet operates as a coordinated battle group with multiple vessels traveling in formation.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <Button 
            onClick={() => {
              onViewCrew();
              onClose();
            }}
            className="w-full"
            variant="default"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Crew ({vessel.characterCount})
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
