/**
 * Campaign Suggestion Chips
 *
 * Lightweight contextual action suggestions displayed above the chat input.
 * Uses campaign-action-suggestions.ts for generation logic.
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, Lightbulb } from 'lucide-react';
import {
  generateActionSuggestions,
  helpPhraseAction,
  type ActionSuggestion,
} from '@/lib/campaign-action-suggestions';

interface CampaignSuggestionChipsProps {
  currentZone?: string;
  timeOfDay?: string;
  dayCount?: number;
  characterName?: string;
  characterPowers?: string | null;
  characterWeapons?: string | null;
  partyMembers?: string[];
  environmentTags?: string[];
  hasCombatTarget?: boolean;
  isInDanger?: boolean;
  currentPressure?: string | null;
  onSuggestionSelect: (text: string) => void;
  currentInput?: string;
  /** Render mode: 'all' (default), 'phrase-only' (just the phrase helper), or 'chips-only' (just action chips). */
  mode?: 'all' | 'phrase-only' | 'chips-only';
}

const CATEGORY_COLORS: Record<string, string> = {
  combat: 'border-red-500/30 text-red-400 hover:bg-red-500/10',
  social: 'border-pink-500/30 text-pink-400 hover:bg-pink-500/10',
  explore: 'border-violet-500/30 text-violet-400 hover:bg-violet-500/10',
  stealth: 'border-slate-500/30 text-slate-400 hover:bg-slate-500/10',
  utility: 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10',
  move: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
  observe: 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10',
};

export default function CampaignSuggestionChips({
  currentZone,
  timeOfDay,
  dayCount,
  characterName,
  characterPowers,
  characterWeapons,
  partyMembers,
  environmentTags,
  hasCombatTarget,
  isInDanger,
  currentPressure,
  onSuggestionSelect,
  currentInput,
}: CampaignSuggestionChipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const suggestions = useMemo(() => generateActionSuggestions({
    currentZone,
    timeOfDay,
    dayCount,
    characterName,
    characterPowers,
    characterWeapons,
    partyMembers,
    environmentTags,
    hasCombatTarget,
    isInDanger,
    currentPressure,
  }), [currentZone, timeOfDay, dayCount, characterName, characterPowers, characterWeapons, partyMembers, environmentTags, hasCombatTarget, isInDanger, currentPressure]);

  // "Help me phrase this" — only show when input is rough
  const phraseHelp = useMemo(() => {
    if (!currentInput || currentInput.length < 3) return null;
    return helpPhraseAction(currentInput, characterName);
  }, [currentInput, characterName]);

  if (suggestions.length === 0 && !phraseHelp) return null;

  return (
    <div className="space-y-1.5">
      {/* Phrase helper */}
      {phraseHelp && (
        <button
          type="button"
          onClick={() => onSuggestionSelect(phraseHelp)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
        >
          <Lightbulb className="w-3 h-3 text-amber-400" />
          <span>Did you mean: <span className="text-foreground/80 italic">"{phraseHelp}"</span></span>
        </button>
      )}

      {/* Suggestion chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(isExpanded ? suggestions : suggestions.slice(0, 3)).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              onSuggestionSelect(s.fullText);
              setIsExpanded(false);
            }}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${CATEGORY_COLORS[s.category] || 'border-border text-muted-foreground hover:bg-muted/50'}`}
          >
            {s.label}
          </button>
        ))}
        {suggestions.length > 3 && !isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
          >
            +{suggestions.length - 3} more
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}
