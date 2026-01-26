import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wrench, Loader2, AlertTriangle } from 'lucide-react';
import { FIX_FLAG_OPTIONS, type FixFlag } from '@/lib/character-3d-types';

interface FixPassPanelProps {
  onSubmit: (flags: FixFlag[], notes: string) => Promise<void>;
  isSubmitting: boolean;
  disabled?: boolean;
}

export default function FixPassPanel({ onSubmit, isSubmitting, disabled }: FixPassPanelProps) {
  const [selectedFlags, setSelectedFlags] = useState<FixFlag[]>([]);
  const [notes, setNotes] = useState('');

  const handleFlagToggle = (flag: FixFlag, checked: boolean) => {
    if (checked) {
      setSelectedFlags(prev => [...prev, flag]);
    } else {
      setSelectedFlags(prev => prev.filter(f => f !== flag));
    }
  };

  const handleSubmit = async () => {
    if (selectedFlags.length === 0 && !notes.trim()) {
      return;
    }
    await onSubmit(selectedFlags, notes);
    // Reset form after submission
    setSelectedFlags([]);
    setNotes('');
  };

  const canSubmit = (selectedFlags.length > 0 || notes.trim().length > 0) && !isSubmitting && !disabled;

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Fix Pass</CardTitle>
        </div>
        <CardDescription>
          Not happy with the result? Select issues and add notes to improve the next generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Issue Flags */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">What needs fixing?</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIX_FLAG_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedFlags.includes(option.value)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={selectedFlags.includes(option.value)}
                  onCheckedChange={(checked) => handleFlagToggle(option.value, checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-medium block">{option.label}</span>
                  <span className="text-xs text-muted-foreground block">{option.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="fix-notes" className="text-sm font-medium">
            Additional Notes (Optional)
          </Label>
          <Textarea
            id="fix-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe specific issues or provide detailed instructions for improvement..."
            className="min-h-[100px] resize-none"
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">{notes.length}/1000</p>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-muted-foreground">
            A fix pass creates a new generation job. Previous models remain accessible in your history.
          </p>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full"
          variant="default"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Starting Fix Pass...
            </>
          ) : (
            <>
              <Wrench className="w-4 h-4 mr-2" />
              Re-Generate with Fix Pass
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
