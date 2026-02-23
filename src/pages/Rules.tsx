import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import PublicNav from '@/components/layout/PublicNav';
import { ROK_RULES, POWER_TIERS } from '@/lib/game-constants';
import { BookOpen, Sparkles, AlertTriangle, CheckCircle, Trophy, Lightbulb, Swords, Dices, Shield, Zap, Brain, Flame, Target, Gamepad2 } from 'lucide-react';

const HOW_TO_PLAY_STEPS = [
  {
    title: 'Welcome to the Arena',
    icon: <Swords className="w-5 h-5" />,
    description: 'Battle other characters in turn-based combat. You describe your actions, and the AI narrates the clash.',
    details: ['Choose your character and an opponent', 'Pick a battle location for the arena', 'Take turns describing attacks, defenses, and strategies', 'The AI opponent reacts to your moves in real-time'],
    tip: 'Start with a Training Sentinel (Tier 2) to learn the ropes!',
  },
  {
    title: 'Dice Combat System',
    icon: <Dices className="w-5 h-5" />,
    description: "Attacks and defenses use a d20 dice system modified by your character's stats.",
    details: ["Each attack rolls d20 + stat modifiers vs opponent's defense", 'Higher stats = bigger bonuses on your rolls', 'Critical hits and mishaps can occur based on your Skill stat', 'You can toggle dice on/off in battle settings'],
    tip: 'Watch the dice roll messages in chat — they show exactly how hits are calculated.',
  },
  {
    title: 'Concentration & Dodge',
    icon: <Shield className="w-5 h-5" />,
    description: 'When an attack hits you, you can spend a Concentration use to attempt a dodge — but it costs stat power.',
    details: ['You start with 3 Concentration uses per battle', 'Using Concentration gives a 50% chance to dodge', 'Each use applies a stat penalty on your next action', 'AI opponents also use Concentration — plan accordingly!'],
    tip: 'Save Concentration for devastating attacks. Small hits are sometimes better to absorb.',
  },
  {
    title: 'Momentum & Edge State',
    icon: <Zap className="w-5 h-5" />,
    description: 'Landing hits and combos builds Momentum (0–100). At 100, you enter Edge State for 2 turns of enhanced power.',
    details: ['Combo chains, counters, and environment plays build momentum', 'Getting interrupted or risk misfires drain momentum', 'Edge State grants +10% precision and −15% risk chance', 'After Edge State expires, momentum drops to 70'],
    tip: 'Chain creative attacks together to build momentum fast.',
  },
  {
    title: 'Overcharge & Risk',
    icon: <Flame className="w-5 h-5" />,
    description: 'Toggle Overcharge before an attack for 1.5–2× potency — but with a 30% chance of a risk misfire.',
    details: ['Toggle the ⚡ Overcharge button before sending your move', 'Success = massive damage amplification', 'Failure = risk misfire, momentum loss, and psychological penalty', 'Edge State reduces risk chance during Overcharge'],
    tip: 'Overcharge is high-risk, high-reward. Use it when your momentum is high to minimize risk chance.',
  },
  {
    title: 'Psychology & Adaptation',
    icon: <Brain className="w-5 h-5" />,
    description: 'Hidden psychological stats (Confidence, Fear, Resolve, Rage) shift during battle and affect your performance.',
    details: ['Landing hits boosts confidence; getting hit raises fear', 'Subtle emoji indicators show your mental state', 'The AI opponent adapts to your fighting patterns every 3 turns', 'Vary your tactics to keep the AI guessing!'],
    tip: 'If you see the "Shaken" indicator, consider a defensive turn to recover your mental state.',
  },
  {
    title: 'Arena Modifiers',
    icon: <Target className="w-5 h-5" />,
    description: 'Daily and weekly modifiers rotate automatically, adding environmental conditions to every battle.',
    details: ['Daily modifiers change the arena conditions (gravity, hazards, etc.)', 'Weekly modifiers add global effects that last all week', 'Modifier badges appear at the top of the battle — hover for details', 'Modifiers affect stats, risk chance, and momentum'],
    tip: 'Check the modifier badges before planning your strategy.',
  },
];

export default function Rules() {
  return (
    <div className="min-h-screen bg-nebula-gradient bg-stars">
      <PublicNav />
      <div className="max-w-4xl mx-auto space-y-8 px-4 py-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-glow bg-gradient-to-r from-primary via-cosmic-pink to-accent bg-clip-text text-transparent flex items-center justify-center gap-3">
          <BookOpen className="w-10 h-10 text-primary" />
          R.O.K. Battle Rules
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          The sacred laws of combat in the Realm of Kings. All warriors must abide by these rules to ensure fair and honourable battles.
        </p>
      </div>

      {/* Creativity Note */}
      <Alert className="border-primary/50 bg-primary/10">
        <Trophy className="h-5 w-5 text-primary" />
        <AlertTitle className="text-primary font-bold flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          How We Determine Victory
        </AlertTitle>
        <AlertDescription className="text-foreground mt-2">
          <p className="mb-2">
            <strong>Winning isn't about who can defeat the other.</strong> In R.O.K., the winner is ultimately decided by who was the <span className="text-primary font-semibold">most creative and unique</span> in combat.
          </p>
          <p className="text-muted-foreground">
            We value creativity, originality, and storytelling above raw power. A cleverly-written underdog can triumph over a poorly-played powerhouse. Express yourself, surprise your opponent, and craft memorable moments—that's what makes a true champion.
          </p>
        </AlertDescription>
      </Alert>

      {/* How to Play */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-center flex items-center justify-center gap-3">
          <Gamepad2 className="w-8 h-8 text-primary" />
          How to Play
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          Learn the core mechanics of R.O.K. battles step by step. Master these systems to dominate the arena.
        </p>

        <div className="grid gap-4">
          {HOW_TO_PLAY_STEPS.map((step, index) => (
            <Card key={index} className="bg-card-gradient border-border hover:glow-primary transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {step.icon}
                  </div>
                  {step.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">{step.description}</p>
                <ul className="space-y-1.5">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span className="text-muted-foreground">{detail}</span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg bg-accent/50 border border-accent px-3 py-2">
                  <p className="text-xs text-accent-foreground">
                    💡 <span className="font-semibold">Tip:</span> {step.tip}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Rules Grid */}
      <div className="grid gap-4">
        {ROK_RULES.map((rule, index) => (
          <Card key={rule.id} className="bg-card-gradient border-border hover:glow-primary transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Badge className="tier-badge tier-4 text-lg w-8 h-8 flex items-center justify-center">
                  {rule.id}
                </Badge>
                {rule.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{rule.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-8" />

      {/* Power Tiers */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-center flex items-center justify-center gap-3">
          <Sparkles className="w-8 h-8 text-cosmic-gold" />
          Power Tiers
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto">
          Characters are ranked by power tier, determining their overall strength and the complexity of abilities they can wield.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {POWER_TIERS.map((tier) => (
            <Card key={tier.level} className={`bg-card-gradient border-border tier-${tier.level}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Badge className={`tier-badge tier-${tier.level}`}>
                    Tier {tier.level}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-lg font-semibold text-foreground">
                  {tier.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Do's and Don'ts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-6 h-6" />
              Good Practice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Be creative and descriptive with your moves</li>
              <li>• Acknowledge hits and take damage appropriately</li>
              <li>• Wait for your turn in multi-player battles</li>
              <li>• Concede gracefully when defeated</li>
              <li>• Communicate clearly in the OOC chat</li>
              <li>• Respect your opponent's character and story</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-card-gradient border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              Avoid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Godmodding (being invincible or auto-hitting)</li>
              <li>• Stacking multiple base powers</li>
              <li>• Using multiple conjunctions in attacks</li>
              <li>• Auto-dodging all attacks</li>
              <li>• Ignoring charging times for powerful moves</li>
              <li>• Refusing to acknowledge valid damage</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
