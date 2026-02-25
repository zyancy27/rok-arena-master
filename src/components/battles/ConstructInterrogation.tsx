import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';
import type { ConstructRules, ConstructPersistence } from '@/lib/battle-dice';

interface ConstructInterrogationProps {
  constructName: string;
  onComplete: (rules: ConstructRules, saveRecurring: boolean) => void;
  onSkip: () => void;
}

export default function ConstructInterrogation({
  constructName,
  onComplete,
  onSkip,
}: ConstructInterrogationProps) {
  const [step, setStep] = useState(0);
  const [persistence, setPersistence] = useState<ConstructPersistence>('one-off');
  const [durability, setDurability] = useState<'low' | 'medium' | 'high'>('medium');
  const [behavior, setBehavior] = useState('');
  const [limitations, setLimitations] = useState('');

  const handleFinish = () => {
    onComplete(
      {
        persistence,
        durabilityLevel: durability,
        behaviorSummary: behavior || `${constructName} construct`,
        limitations: limitations || undefined,
      },
      persistence === 'recurring'
    );
  };

  return (
    <div className="bg-muted/30 border border-muted rounded-lg p-3 space-y-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <HelpCircle className="w-4 h-4 text-purple-400" />
        <span className="font-medium">New Construct: <span className="text-foreground">{constructName}</span></span>
        <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={onSkip}>
          Skip
        </Button>
      </div>

      {step === 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Is this recurring or one-off?</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={persistence === 'recurring' ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => { setPersistence('recurring'); setStep(1); }}
            >
              Recurring
            </Button>
            <Button
              size="sm"
              variant={persistence === 'one-off' ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => { setPersistence('one-off'); setStep(1); }}
            >
              One-off
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Durability?</p>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as const).map(d => (
              <Button
                key={d}
                size="sm"
                variant={durability === d ? 'default' : 'outline'}
                className="h-7 text-xs capitalize"
                onClick={() => { setDurability(d); setStep(2); }}
              >
                {d}
              </Button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">How does it work? (1 sentence)</p>
          <div className="flex gap-2">
            <Input
              value={behavior}
              onChange={e => setBehavior(e.target.value)}
              placeholder="e.g. Absorbs energy attacks"
              className="h-7 text-xs"
              maxLength={120}
            />
            <Button size="sm" className="h-7 text-xs" onClick={() => setStep(3)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Weaknesses/limits? (optional)</p>
          <div className="flex gap-2">
            <Input
              value={limitations}
              onChange={e => setLimitations(e.target.value)}
              placeholder="e.g. Weak to physical attacks"
              className="h-7 text-xs"
              maxLength={120}
            />
            <Button size="sm" className="h-7 text-xs" onClick={handleFinish}>
              Done
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-1">
        {[0, 1, 2, 3].map(s => (
          <div key={s} className={`h-0.5 flex-1 rounded ${s <= step ? 'bg-purple-500' : 'bg-muted'}`} />
        ))}
      </div>
    </div>
  );
}
