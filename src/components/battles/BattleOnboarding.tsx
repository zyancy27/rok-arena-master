import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Swords,
  Dices,
  Shield,
  Zap,
  Brain,
  Flame,
  Target,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Sparkles,
  X,
} from 'lucide-react';

const ONBOARDING_KEY = 'battleOnboardingComplete';
const ONBOARDING_STEP_KEY = 'battleOnboardingStep';

interface OnboardingStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  details: string[];
  tip: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the Arena',
    icon: <Swords className="w-6 h-6" />,
    description:
      'Battle other characters in turn-based combat. You describe your actions, and the Narrator brings the clash to life.',
    details: [
      'Choose your character and an opponent',
      'Pick a battle location for the arena',
      'Take turns describing attacks, defenses, and strategies',
      'Your opponent reacts to your moves in real-time',
    ],
    tip: 'Start with a Training Sentinel (Tier 2) to learn the ropes!',
  },
  {
    id: 'tiers',
    title: 'Power Tiers',
    icon: <Sparkles className="w-6 h-6" />,
    description:
      'Characters are ranked from Tier 1 (Common Human) to Tier 7 (Logic Resorts). Higher tiers have stronger abilities.',
    details: [
      'Tier 1–2: Normal to enhanced humans — no supernatural powers',
      'Tier 3: Super humans — healing, psychic powers, energy blasts',
      'Tier 4: Legends — control mass and energy intrinsically',
      'Tier 5+: Reality warpers and beyond — extreme power',
    ],
    tip: 'Match your character\'s tier to the opponent for a balanced fight. A Tier 2 vs Tier 5 will be very one-sided!',
  },
  {
    id: 'dice',
    title: 'Dice Combat System',
    icon: <Dices className="w-6 h-6" />,
    description:
      'Attacks and defenses use a d20 dice system modified by your character\'s stats. Hits and misses are determined by the roll.',
    details: [
      'Each attack rolls d20 + stat modifiers vs opponent\'s defense',
      'Higher stats = bigger bonuses on your rolls',
      'Critical hits and mishaps can occur based on your Skill stat',
      'You can toggle dice on/off in battle settings',
    ],
    tip: 'Watch the dice roll messages in chat — they show exactly how hits are calculated.',
  },
  {
    id: 'concentration',
    title: 'Concentration & Dodge',
    icon: <Shield className="w-6 h-6" />,
    description:
      'When an attack hits you, you can spend a Concentration use to attempt a dodge — but it costs stat power.',
    details: [
      'You start with 3 Concentration uses per battle',
      'Using Concentration gives a 50% chance to dodge',
      'Each use applies a stat penalty on your next action',
      'Opponents also use Concentration — plan accordingly!',
    ],
    tip: 'Save Concentration for devastating attacks. Small hits are sometimes better to absorb.',
  },
  {
    id: 'momentum',
    title: 'Momentum & Edge State',
    icon: <Zap className="w-6 h-6" />,
    description:
      'Landing hits and combos builds Momentum (0–100). At 100, you enter Edge State for 2 turns of enhanced power.',
    details: [
      'Combo chains, counters, and environment plays build momentum',
      'Getting interrupted or risk misfires drain momentum',
      'Edge State grants +10% precision and −15% risk chance',
      'After Edge State expires, momentum drops to 70',
    ],
    tip: 'Chain creative attacks together to build momentum fast. The glowing meter shows your progress.',
  },
  {
    id: 'overcharge',
    title: 'Overcharge & Risk',
    icon: <Flame className="w-6 h-6" />,
    description:
      'Toggle Overcharge before an attack for 1.5–2× potency — but with a 30% chance of a risk misfire.',
    details: [
      'Toggle the ⚡ Overcharge button before sending your move',
      'Success = massive damage amplification',
      'Failure = risk misfire, momentum loss, and psychological penalty',
      'Edge State reduces risk chance during Overcharge',
    ],
    tip: 'Overcharge is high-risk, high-reward. Use it when your momentum is high to minimize risk chance.',
  },
  {
    id: 'psychology',
    title: 'Psychology & Adaptation',
    icon: <Brain className="w-6 h-6" />,
    description:
      'Hidden psychological stats (Confidence, Fear, Resolve, Rage) shift during battle and affect your performance.',
    details: [
      'Landing hits boosts confidence; getting hit raises fear',
      'Subtle emoji indicators show your mental state',
      'Your opponent adapts to your fighting patterns every 3 turns',
      'Vary your tactics to keep your opponent guessing!',
    ],
    tip: 'If you see the "Shaken" indicator, consider a defensive turn to recover your mental state.',
  },
  {
    id: 'arena',
    title: 'Arena Modifiers',
    icon: <Target className="w-6 h-6" />,
    description:
      'Daily and weekly modifiers rotate automatically, adding environmental conditions to every battle.',
    details: [
      'Daily modifiers change the arena conditions (gravity, hazards, etc.)',
      'Weekly modifiers add global effects that last all week',
      'Modifier badges appear at the top of the battle — hover for details',
      'Modifiers affect stats, risk chance, and momentum',
    ],
    tip: 'Check the modifier badges before planning your strategy. Some modifiers favor aggressive play, others reward patience.',
  },
];

interface BattleOnboardingProps {
  onComplete: () => void;
  forceShow?: boolean;
}

export default function BattleOnboarding({ onComplete, forceShow }: BattleOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      return;
    }
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      setVisible(true);
      const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY);
      if (savedStep) setCurrentStep(Math.min(parseInt(savedStep, 10), STEPS.length - 1));
    }
  }, [forceShow]);

  useEffect(() => {
    if (visible) {
      localStorage.setItem(ONBOARDING_STEP_KEY, String(currentStep));
    }
  }, [currentStep, visible]);

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    localStorage.removeItem(ONBOARDING_STEP_KEY);
    setVisible(false);
    onComplete();
  };

  const skip = () => {
    finish();
  };

  if (!visible) return null;

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg border-primary/30 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5">
            <Badge variant="outline" className="text-xs font-normal">
              Step {currentStep + 1} of {STEPS.length}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={skip}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Progress value={progress} className="mx-5 mt-3 h-1.5" />

          {/* Content */}
          <div className="px-5 pt-5 pb-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                {step.icon}
              </div>
              <h2 className="text-xl font-bold">{step.title}</h2>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">
              {step.description}
            </p>

            <ul className="space-y-2">
              {step.details.map((detail, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-lg bg-accent/50 border border-accent px-3 py-2">
              <p className="text-xs font-medium text-accent-foreground">
                💡 <span className="font-semibold">Tip:</span> {step.tip}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-5 pb-5 pt-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((s) => s - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep
                      ? 'bg-primary'
                      : i < currentStep
                        ? 'bg-primary/40'
                        : 'bg-muted-foreground/30'
                  }`}
                  onClick={() => setCurrentStep(i)}
                />
              ))}
            </div>

            {isLast ? (
              <Button size="sm" onClick={finish}>
                Start Fighting!
                <Swords className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => setCurrentStep((s) => s + 1)}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Utility: check if onboarding is complete */
export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

/** Utility: reset onboarding (for re-triggering) */
export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
  localStorage.removeItem(ONBOARDING_STEP_KEY);
}
