import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Zap, Timer, Save } from 'lucide-react';

interface EmergencyLocation {
  name: string;
  description: string;
  hazards: string;
  urgency: string;
  countdownTurns: number;
  tags: string[];
}

interface Props {
  character1Name?: string;
  character2Name?: string;
  battleType: 'PvE' | 'PvP' | 'EvE';
  onLocationGenerated: (location: EmergencyLocation) => void;
  onSaveLocation?: (location: EmergencyLocation) => void;
}

export default function EmergencyLocationGenerator({
  character1Name,
  character2Name,
  battleType,
  onLocationGenerated,
  onSaveLocation,
}: Props) {
  const [enabled, setEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLocation, setGeneratedLocation] = useState<EmergencyLocation | null>(null);

  const generateLocation = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-emergency-location', {
        body: { character1Name, character2Name, battleType },
      });

      if (error) throw error;

      if (data?.name) {
        setGeneratedLocation(data);
        onLocationGenerated(data);
        toast.success(`Emergency location generated: ${data.name}`);
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

  const handleSave = () => {
    if (generatedLocation && onSaveLocation) {
      onSaveLocation(generatedLocation);
    }
  };

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
              Generate a high-intensity crisis scenario as the battle arena
            </p>
          </div>
        </div>
        <Switch
          id="emergency-loc"
          checked={enabled}
          onCheckedChange={setEnabled}
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
                Generate Emergency Location
              </>
            )}
          </Button>

          {generatedLocation && (
            <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    {generatedLocation.name}
                  </h3>
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {generatedLocation.countdownTurns} turns
                  </Badge>
                </div>
                <p className="text-sm">{generatedLocation.description}</p>
                <div className="text-xs space-y-1">
                  <p className="text-red-400 font-medium">⚠️ Hazards: {generatedLocation.hazards}</p>
                  <p className="text-orange-400 font-medium">⏰ Urgency: {generatedLocation.urgency}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {generatedLocation.tags?.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                {onSaveLocation && (
                  <Button variant="outline" size="sm" onClick={handleSave} className="w-full">
                    <Save className="w-3 h-3 mr-2" />
                    Save to Location Library
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
