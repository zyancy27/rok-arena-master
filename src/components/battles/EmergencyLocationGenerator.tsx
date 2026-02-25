import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Zap, Timer, Save, RefreshCw } from 'lucide-react';

interface EmergencyLocation {
  name: string;
  description: string;
  hazards: string;
  urgency: string;
  countdownTurns: number;
  tags: string[];
  rarityTier?: 'grounded' | 'advanced' | 'extreme' | 'mythic';
}

interface Props {
  character1Name?: string;
  character2Name?: string;
  character1Level?: number;
  character2Level?: number;
  battleType: 'PvE' | 'PvP' | 'EvE';
  onLocationGenerated: (location: EmergencyLocation) => void;
  onSaveLocation?: (location: EmergencyLocation) => void;
  planetName?: string;
  planetDescription?: string;
  planetGravity?: number | null;
}

const RARITY_STYLES: Record<string, { label: string; color: string }> = {
  grounded: { label: 'Grounded', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
  advanced: { label: 'Advanced Sci-Fi', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  extreme: { label: 'Extreme', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  mythic: { label: 'Mythic', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
};

export default function EmergencyLocationGenerator({
  character1Name,
  character2Name,
  character1Level,
  character2Level,
  battleType,
  onLocationGenerated,
  onSaveLocation,
  planetName,
  planetDescription,
  planetGravity,
}: Props) {
  const [enabled, setEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLocation, setGeneratedLocation] = useState<EmergencyLocation | null>(null);
  // Session memory: track all generated location names+descriptions to prevent duplication
  const sessionHistory = useRef<string[]>([]);

  const generateLocation = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-emergency-location', {
        body: {
          character1Name,
          character2Name,
          battleType,
          character1Level,
          character2Level,
          planetName: planetName || null,
          planetDescription: planetDescription || null,
          planetGravity: planetGravity || null,
          previousLocations: sessionHistory.current,
        },
      });

      if (error) throw error;

      if (data?.name) {
        setGeneratedLocation(data);
        onLocationGenerated(data);
        // Track for deduplication
        sessionHistory.current.push(`${data.name}: ${data.description}`);
        toast.success(`Emergency generated: ${data.name}`);
      } else {
        throw new Error('Invalid response');
      }
    } catch (err: any) {
      console.error('Location generation error:', err);
      if (err?.message?.includes('Rate limit')) {
        toast.error('Rate limited — try again in a moment');
      } else {
        toast.error('Failed to generate emergency location');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    generateLocation();
  };

  const handleSave = () => {
    if (generatedLocation && onSaveLocation) {
      onSaveLocation(generatedLocation);
    }
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      setGeneratedLocation(null);
    }
  };

  // Reset session memory (call externally when battle starts)
  const resetSessionMemory = () => {
    sessionHistory.current = [];
  };

  const rarityInfo = generatedLocation?.rarityTier
    ? RARITY_STYLES[generatedLocation.rarityTier] || RARITY_STYLES.grounded
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <Label htmlFor="emergency-loc" className="text-sm font-medium cursor-pointer">
              AI Emergency Location
            </Label>
            <p className="text-xs text-muted-foreground">
              Generate a dynamic crisis scenario as the battle arena
            </p>
          </div>
        </div>
        <Switch
          id="emergency-loc"
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {enabled && (
        <div className="space-y-3">
          <Button
            onClick={generateLocation}
            disabled={isGenerating}
            variant="destructive"
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Crisis...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {generatedLocation ? 'Generate New Emergency' : 'Generate Emergency Location'}
              </>
            )}
          </Button>

          {generatedLocation && (
            <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <h3 className="font-bold text-base break-words min-w-0">{generatedLocation.name}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {rarityInfo && (
                      <Badge variant="outline" className={`text-[10px] ${rarityInfo.color}`}>
                        {rarityInfo.label}
                      </Badge>
                    )}
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      {generatedLocation.countdownTurns}T
                    </Badge>
                  </div>
                </div>
                <p className="text-sm">{generatedLocation.description}</p>
                <div className="text-xs space-y-1">
                  <p className="text-red-400 font-medium">⚠️ {generatedLocation.hazards}</p>
                  <p className="text-orange-400 font-medium">⏰ {generatedLocation.urgency}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {generatedLocation.tags?.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Regenerate
                  </Button>
                  {onSaveLocation && (
                    <Button variant="outline" size="sm" onClick={handleSave} className="flex-1">
                      <Save className="w-3 h-3 mr-2" />
                      Save
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
