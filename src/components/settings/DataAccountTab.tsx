import { Button } from '@/components/ui/button';
import { SettingsSection } from './SettingsSection';
import { SettingsSelect } from './SettingsSelect';
import { Trash2, Download, RotateCcw, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

const REPLAY_OPTIONS = [
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '0', label: 'Unlimited' },
];

interface Props {
  onResetAll: () => void;
}

export function DataAccountTab({ onResetAll }: Props) {
  const [replayStorage, setReplayStorage] = useState('30');

  const handleClearCache = () => {
    try {
      const keysToKeep = ['sb-', 'supabase'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.some(k => key.startsWith(k))) {
          localStorage.removeItem(key);
        }
      });
      toast.success('Local cache cleared');
    } catch {
      toast.error('Failed to clear cache');
    }
  };

  return (
    <SettingsSection title="Data & Account" description="Manage your data and account">
      <SettingsSelect label="Replay Storage Length" value={replayStorage} options={REPLAY_OPTIONS} onValueChange={setReplayStorage} />
      
      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start" onClick={handleClearCache}>
          <Trash2 className="w-4 h-4 mr-2" /> Clear Local Cache
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Battle log download coming soon')}>
          <Download className="w-4 h-4 mr-2" /> Download Battle Logs
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Cross-device sync coming soon')}>
          <RefreshCw className="w-4 h-4 mr-2" /> Sync Across Devices
        </Button>
        <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={onResetAll}>
          <RotateCcw className="w-4 h-4 mr-2" /> Reset All Settings
        </Button>
        <Button variant="destructive" className="w-full justify-start" onClick={() => toast.info('Account deletion requires contacting support')}>
          <Trash2 className="w-4 h-4 mr-2" /> Delete Account
        </Button>
      </div>
    </SettingsSection>
  );
}
