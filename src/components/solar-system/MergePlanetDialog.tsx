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
import { Loader2, Merge, AlertTriangle } from 'lucide-react';

interface PlanetOption {
  name: string;
  displayName: string;
  characterCount: number;
  color: string;
}

interface MergePlanetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourcePlanet: PlanetOption | null;
  availablePlanets: PlanetOption[];
  onMerge: (sourcePlanetName: string, targetPlanetName: string) => Promise<void>;
}

export default function MergePlanetDialog({
  isOpen,
  onClose,
  sourcePlanet,
  availablePlanets,
  onMerge,
}: MergePlanetDialogProps) {
  const [targetPlanetName, setTargetPlanetName] = useState<string>('');
  const [merging, setMerging] = useState(false);

  const targetPlanet = availablePlanets.find(p => p.name === targetPlanetName);
  
  // Filter out the source planet and ships/fleets from target options
  const targetOptions = availablePlanets.filter(
    p => p.name !== sourcePlanet?.name && 
         !p.name.toLowerCase().includes('ship') && 
         !p.name.toLowerCase().includes('fleet')
  );

  const handleMerge = async () => {
    if (!sourcePlanet || !targetPlanetName) return;
    
    setMerging(true);
    try {
      await onMerge(sourcePlanet.name, targetPlanetName);
      setTargetPlanetName('');
      onClose();
    } finally {
      setMerging(false);
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
            <Merge className="w-5 h-5 text-primary" />
            Merge Planet
          </DialogTitle>
          <DialogDescription>
            Merge <strong>{sourcePlanet.displayName}</strong> into another planet. 
            All characters and moons will be transferred to the target planet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source planet info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div 
              className="w-8 h-8 rounded-full flex-shrink-0"
              style={{ 
                backgroundColor: sourcePlanet.color,
                boxShadow: `0 0 10px ${sourcePlanet.color}40`
              }}
            />
            <div className="flex-1">
              <p className="font-medium">{sourcePlanet.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {sourcePlanet.characterCount} character{sourcePlanet.characterCount !== 1 ? 's' : ''} will be moved
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="text-muted-foreground">↓</div>
          </div>

          {/* Target planet selection */}
          <div className="space-y-2">
            <Label>Merge into</Label>
            <Select value={targetPlanetName} onValueChange={setTargetPlanetName}>
              <SelectTrigger>
                <SelectValue placeholder="Select target planet..." />
              </SelectTrigger>
              <SelectContent>
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
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-sm">
                <strong>{sourcePlanet.displayName}</strong> will be deleted and all 
                {sourcePlanet.characterCount > 0 ? ` ${sourcePlanet.characterCount} character${sourcePlanet.characterCount !== 1 ? 's' : ''}` : ''} 
                {sourcePlanet.characterCount > 0 ? ' and moons will' : ' moons will'} be transferred to{' '}
                <strong>{targetPlanet.displayName}</strong>.
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>This action cannot be undone. The source planet will be permanently deleted.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={merging}>
            Cancel
          </Button>
          <Button 
            onClick={handleMerge} 
            disabled={!targetPlanetName || merging}
            variant="default"
          >
            {merging ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <Merge className="w-4 h-4 mr-2" />
                Merge Planets
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
