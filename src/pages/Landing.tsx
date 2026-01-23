import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PublicNav from '@/components/layout/PublicNav';
import { Swords, Sparkles, Users, BookOpen, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-nebula-gradient bg-stars">
      <PublicNav />
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Swords className="w-16 h-16 text-primary animate-pulse-glow" />
            <Sparkles className="w-10 h-10 text-cosmic-gold animate-float" />
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-glow bg-gradient-to-r from-primary via-cosmic-pink to-accent bg-clip-text text-transparent leading-tight">
            Realm of Kings
          </h1>
          <p className="text-2xl md:text-3xl text-muted-foreground">
            PVP Arena
          </p>

          {/* Description */}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Enter the cosmic battleground where warriors clash in text-based combat.
            Create legendary characters, master your powers, and challenge opponents
            across the stars in the ultimate roleplay PVP experience.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="glow-primary text-lg px-8" asChild>
              <Link to="/auth">
                Enter the Arena
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild>
              <Link to="/rules">
                <BookOpen className="mr-2 w-5 h-5" />
                Learn the Rules
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 max-w-5xl mx-auto">
          <Card className="bg-card-gradient border-border hover:glow-primary transition-all">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Create Characters</h3>
              <p className="text-muted-foreground">
                Forge unique warriors with custom powers, backstories, and abilities
                following R.O.K. lore.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card-gradient border-border hover:glow-accent transition-all">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
                <Swords className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-2">Epic Battles</h3>
              <p className="text-muted-foreground">
                Engage in real-time text-based combat with dual chat channels
                for roleplay and strategy.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card-gradient border-border hover:glow-gold transition-all">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cosmic-gold/20 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-cosmic-gold" />
              </div>
              <h3 className="text-xl font-bold mb-2">R.O.K. Rules</h3>
              <p className="text-muted-foreground">
                Fair combat governed by the sacred laws: one power, turn order,
                and honourable resolution.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Power Tiers Preview */}
        <div className="mt-24 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-cosmic-gold" />
            Seven Power Tiers
          </h2>
          <p className="text-muted-foreground mb-8">
            From Common Human to Logic Resorts, climb the ranks of cosmic power
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Common Human', 'Enhanced Human', 'Super Human', 'Title of God', 'Title of Titan', 'Logic Bending', 'Logic Resorts'].map((tier, i) => (
              <span
                key={tier}
                className={`tier-badge tier-${i + 1} px-4 py-2`}
              >
                Tier {i + 1}: {tier}
              </span>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-24 text-center">
          <p className="text-muted-foreground mb-4">
            Ready to prove your worth?
          </p>
          <Button size="lg" className="glow-primary" asChild>
            <Link to="/auth">
              Join the Realm
              <Swords className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
