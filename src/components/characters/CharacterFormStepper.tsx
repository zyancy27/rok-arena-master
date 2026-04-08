/**
 * Character Form Stepper
 *
 * Wraps the existing CharacterForm sections into a tabbed wizard.
 * This component provides the step navigation UI — the actual form
 * content is rendered by CharacterForm via a render-prop pattern.
 *
 * Steps:
 * 1. Core Identity (name, tier, image, AI tools)
 * 2. Origin & World (race, sub-race, home planet, groups)
 * 3. Power & Combat (powers, abilities, weapons, stats)
 * 4. Personality & Mentality (alignment, archetype, personality, mentality)
 * 5. Appearance & Timeline (lore, appearance, timeline)
 * 6. Review & Finalize (summary, submit)
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  User, Globe, Swords, Smile, BookOpen, CheckCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

export interface StepDefinition {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  isComplete: boolean;
}

interface CharacterFormStepperProps {
  currentStep: number;
  steps: StepDefinition[];
  onStepChange: (step: number) => void;
  canProceed?: boolean;
}

export const DEFAULT_STEPS: Omit<StepDefinition, 'isComplete'>[] = [
  { id: 'identity', label: 'Core Identity', shortLabel: 'Identity', icon: <User className="w-4 h-4" /> },
  { id: 'origin', label: 'Origin & World', shortLabel: 'Origin', icon: <Globe className="w-4 h-4" /> },
  { id: 'powers', label: 'Power & Combat', shortLabel: 'Powers', icon: <Swords className="w-4 h-4" /> },
  { id: 'personality', label: 'Personality & Mentality', shortLabel: 'Personality', icon: <Smile className="w-4 h-4" /> },
  { id: 'lore', label: 'Appearance & Timeline', shortLabel: 'Lore', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'review', label: 'Review & Finalize', shortLabel: 'Review', icon: <CheckCircle className="w-4 h-4" /> },
];

export default function CharacterFormStepper({
  currentStep,
  steps,
  onStepChange,
  canProceed = true,
}: CharacterFormStepperProps) {
  return (
    <div className="space-y-3">
      {/* Step indicators — horizontal scrollable on mobile */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {steps.map((step, i) => {
          const isActive = i === currentStep;
          const isPast = i < currentStep;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepChange(i)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/30 font-medium'
                  : isPast && step.isComplete
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-muted/30 text-muted-foreground border border-transparent hover:border-border'
              }`}
            >
              <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-primary text-primary-foreground' 
                  : isPast && step.isComplete ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isPast && step.isComplete ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{step.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={currentStep === 0}
          onClick={() => onStepChange(currentStep - 1)}
          className="text-xs gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </Button>

        <span className="text-[11px] text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </span>

        {currentStep < steps.length - 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onStepChange(currentStep + 1)}
            disabled={!canProceed}
            className="text-xs gap-1"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <div className="w-16" /> // Spacer for alignment
        )}
      </div>
    </div>
  );
}
