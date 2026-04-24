import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { CampaignResponseSuggestion } from '@/lib/campaign-response-suggestions';
import { Brain, ChevronDown, ChevronUp, MessageCircleQuestion, RefreshCw, Send, Sparkles, Swords, Undo2 } from 'lucide-react';

interface CampaignResponseSuggestionsProps {
  suggestions: CampaignResponseSuggestion[];
  selectedSuggestion: CampaignResponseSuggestion | null;
  isLoading?: boolean;
  disabled?: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelect: (suggestion: CampaignResponseSuggestion) => void;
  onCancel: () => void;
  onConfirm: (suggestion: CampaignResponseSuggestion) => void;
  onRefresh?: () => void;
  /** Optional extra content (e.g. quick action chips) rendered inside the panel. */
  extraContent?: ReactNode;
}

function getIntentLabel(intent: CampaignResponseSuggestion['intent']) {
  switch (intent) {
    case 'action':
      return 'Action';
    case 'question':
      return 'Question';
    case 'reaction':
      return 'Reaction';
    case 'dialogue':
    default:
      return 'Dialogue';
  }
}

function getIntentIcon(intent: CampaignResponseSuggestion['intent']) {
  switch (intent) {
    case 'action':
      return Swords;
    case 'question':
      return MessageCircleQuestion;
    case 'reaction':
      return Sparkles;
    case 'dialogue':
    default:
      return Brain;
  }
}

export default function CampaignResponseSuggestions({
  suggestions,
  selectedSuggestion,
  isLoading = false,
  disabled = false,
  collapsed,
  onToggleCollapse,
  onSelect,
  onCancel,
  onConfirm,
  onRefresh,
  extraContent,
}: CampaignResponseSuggestionsProps) {

  if (!isLoading && suggestions.length === 0 && !selectedSuggestion && !extraContent) return null;

  return (
    <section
      aria-label="Suggested responses"
      className="rounded-3xl border border-border/60 bg-card/60 px-3 py-3 shadow-sm backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full items-center gap-2 text-xs text-muted-foreground"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/50 text-accent-foreground">
          <Brain className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="font-medium text-foreground">Possible thoughts</p>
          {!collapsed && (
            <p className="truncate">Private prompts for your character — nothing sends until you confirm.</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onRefresh && !collapsed && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
              disabled={disabled || isLoading}
              aria-label="Refresh response suggestions"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </button>

      {!collapsed && (
        <div className="mt-2">
          {selectedSuggestion ? (
            <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {(() => {
                  const Icon = getIntentIcon(selectedSuggestion.intent);
                  return <Icon className="h-3.5 w-3.5" />;
                })()}
                <span>{getIntentLabel(selectedSuggestion.intent)}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{selectedSuggestion.label}</p>
              <p className="mt-2 text-sm text-muted-foreground">{selectedSuggestion.detail}</p>
              <div className="mt-3 rounded-2xl bg-muted/60 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Will send</p>
                <p className="mt-1 text-sm text-foreground">{selectedSuggestion.message}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 gap-1.5 rounded-full"
                  onClick={() => onConfirm(selectedSuggestion)}
                  disabled={disabled}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send thought
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-full"
                  onClick={onCancel}
                  disabled={disabled}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`loading-${index}`}
                      className="h-10 w-full animate-pulse rounded-full border border-border/50 bg-muted/50 sm:w-[calc(50%-0.25rem)]"
                    />
                  ))
                : suggestions.map((suggestion) => {
                    const Icon = getIntentIcon(suggestion.intent);
                    return (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => onSelect(suggestion)}
                        disabled={disabled}
                        className="group flex w-full items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-2 text-left transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-[calc(50%-0.25rem)]"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/50 text-accent-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 text-sm text-foreground">{suggestion.label}</span>
                      </button>
                    );
                  })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
