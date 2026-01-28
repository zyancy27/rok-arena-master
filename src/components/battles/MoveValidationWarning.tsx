import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import { MoveValidationResult } from '@/lib/move-validation';

interface MoveValidationWarningProps {
  validation: MoveValidationResult;
  onExplain: (explanation: string) => void;
  onRedo: () => void;
  onAccept: () => void;
  characterName: string;
}

export default function MoveValidationWarning({
  validation,
  onExplain,
  onRedo,
  onAccept,
  characterName,
}: MoveValidationWarningProps) {
  const [explanation, setExplanation] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);

  if (validation.isValid) return null;

  const handleSubmitExplanation = () => {
    if (explanation.trim()) {
      onExplain(explanation.trim());
    }
  };

  return (
    <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/50 text-amber-200">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="text-amber-400">Move Validation Warning</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm">{validation.warningMessage}</p>
        
        {validation.suggestedFix && (
          <p className="text-xs text-amber-300/80 italic">{validation.suggestedFix}</p>
        )}

        {!showExplanation ? (
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
              onClick={() => setShowExplanation(true)}
            >
              <Check className="w-3 h-3 mr-1" />
              Explain How This Works
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
              onClick={onRedo}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Redo Move
            </Button>
          </div>
        ) : (
          <div className="space-y-2 mt-3">
            <p className="text-xs text-muted-foreground">
              Explain how {characterName} can perform this action with their existing abilities:
            </p>
            <Textarea
              placeholder={`Example: "${characterName} absorbed fire energy during their training arc, allowing them to temporarily use flame attacks despite their ice powers..."`}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="min-h-[80px] text-sm bg-background/50"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSubmitExplanation}
                disabled={!explanation.trim()}
              >
                <Check className="w-3 h-3 mr-1" />
                Submit Explanation
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowExplanation(false)}
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
