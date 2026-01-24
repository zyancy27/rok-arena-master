import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Moon, AlertTriangle, Globe } from 'lucide-react';

interface PlanetOption {
  name: string;
  displayName: string;
  characterCount: number;
  color: string;
}

interface ConvertToMoonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourcePlanet: PlanetOption | null;
  availablePlanets: PlanetOption[];
  onConvert: (sourcePlanetName: string, targetPlanetName: string) => Promise<void>;
}

export default function ConvertToMoonDialog({
  isOpen,
  onClose,
  sourcePlanet,
  availablePlanets,
  onConvert,
}: ConvertToMoonDialogProps) {
  const [targetPlanetName, setTargetPlanetName] = useState<string>('');
  const [converting, setConverting] = useState(false);

  const targetPlanet = availablePlanets.find(p => p.name === targetPlanetName);
  
  // Filter out the source planet and ships/fleets from target options
  const targetOptions = availablePlanets.filter(
    p => p.name !== sourcePlanet?.name && 
         !p.name.toLowerCase().includes('ship') && 
         !p.name.toLowerCase().includes('fleet')
  );

  const handleConvert = async () => {
    if (!sourcePlanet || !targetPlanetName) return;
    
    setConverting(true);
    try {
      await onConvert(sourcePlanet.name, targetPlanetName);
      setTargetPlanetName('');
      onClose();
    } finally {
      setConverting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTargetPlanetName('');
      onClose();
    }
  };

  if (!sourcePlanet) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-primary" />
            Convert to Moon
          </DialogTitle>
          <DialogDescription>
            Transform <strong>{sourcePlanet.displayName}</strong> into a moon orbiting another planet.
            All characters will move to the new moon.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source planet becoming moon */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div 
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ 
                backgroundColor: sourcePlanet.color,
                boxShadow: `0 0 10px ${sourcePlanet.color}40`
              }}
            >
              <Globe className="w-5 h-5 text-white/80" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{sourcePlanet.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {sourcePlanet.characterCount} character{sourcePlanet.characterCount !== 1 ? 's' : ''} • Planet
              </p>
            </div>
          </div>

          {/* Arrow showing transformation */}
          <div className="flex justify-center items-center gap-2 text-muted-foreground">
            <span className="text-xs">becomes a moon of</span>
            <span>↓</span>
          </div>

          {/* Target planet selection */}
          <div className="space-y-2">
            <Label>Parent Planet</Label>
            <Select value={targetPlanetName} onValueChange={setTargetPlanetName}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select parent planet..." />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {targetOptions.map(planet => (
                  <SelectItem key={planet.name} value={planet.name}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: planet.color }}
                      />
                      <span>{planet.displayName}</span>
                      <span className="text-muted-foreground text-xs">
                        ({planet.characterCount} characters)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          {targetPlanet && (
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center relative"
                  style={{ backgroundColor: targetPlanet.color }}
                >
                  <Globe className="w-6 h-6 text-white/80" />
                  {/* Mini moon orbiting */}
                  <div 
                    className="absolute -right-1 -top-1 w-5 h-5 rounded-full border-2 border-background"
                    style={{ backgroundColor: sourcePlanet.color }}
                  />
                </div>
                <div>
                  <p className="font-medium">{targetPlanet.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    with moon: {sourcePlanet.displayName}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {sourcePlanet.characterCount > 0 && (
                  <>All {sourcePlanet.characterCount} character{sourcePlanet.characterCount !== 1 ? 's' : ''} will now reside on the moon.</>
                )}
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>The planet will be converted to a moon. Its physics properties will be adjusted for lunar scale.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={converting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConvert} 
            disabled={!targetPlanetName || converting}
            variant="default"
          >
            {converting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 mr-2" />
                Convert to Moon
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
