import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ROK_RULES, POWER_TIERS } from '@/lib/game-constants';
import { BookOpen, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Rules() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
  );
}
