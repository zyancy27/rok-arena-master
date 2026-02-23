import { Button } from '@/components/ui/button';
import { SettingsSection } from './SettingsSection';
import { SettingsToggle } from './SettingsToggle';
import { Bug, Zap, Wind, BarChart3, Brain, Trophy, CloudLightning } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export function DeveloperTab() {
  const [debugMode, setDebugMode] = useState(false);

  return (
    <SettingsSection title="Developer / Admin Tools" description="Debug and testing controls — admin only">
      <SettingsToggle label="Enable Debug Mode" description="Show debug overlays and state info" checked={debugMode} onCheckedChange={setDebugMode} />
      
      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Battle state JSON viewer coming soon')}>
          <Bug className="w-4 h-4 mr-2" /> View Battle State JSON
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Glitch trigger simulated')}>
          <Zap className="w-4 h-4 mr-2" /> Force Glitch Trigger
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Momentum spike simulated')}>
          <BarChart3 className="w-4 h-4 mr-2" /> Simulate Momentum Spike
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('AI profile override coming soon')}>
          <Brain className="w-4 h-4 mr-2" /> Override AI Profile
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Tier ladder reset coming soon')}>
          <Trophy className="w-4 h-4 mr-2" /> Reset Tier Ladder
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Environmental collapse simulated')}>
          <CloudLightning className="w-4 h-4 mr-2" /> Simulate Environmental Collapse
        </Button>
      </div>
    </SettingsSection>
  );
}
