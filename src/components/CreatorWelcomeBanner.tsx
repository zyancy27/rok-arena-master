import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Instagram, Heart } from 'lucide-react';

const STORAGE_KEY = 'ocrp:creator-welcome-dismissed:v1';

interface CreatorWelcomeBannerProps {
  /** Optional override for placement spacing */
  className?: string;
}

export default function CreatorWelcomeBanner({ className }: CreatorWelcomeBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Card
      className={`relative overflow-hidden bg-card-gradient border-primary/30 glow-primary ${className ?? ''}`}
      role="region"
      aria-label="A note from the creator"
    >
      {/* Decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-cosmic-pink/20 blur-3xl"
      />

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss welcome note"
        className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <CardContent className="relative p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/20 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              A note from the creator
            </p>
            <h3 className="text-lg md:text-xl font-bold text-glow">
              Welcome to O.C.R.P.
            </h3>
          </div>
        </div>

        <div className="space-y-3 text-sm md:text-base text-muted-foreground leading-relaxed max-w-3xl">
          <p>
            Hey — I'm the creator of this project, and I'm a real person building this
            with care for people who truly love their characters, stories, and creative worlds.
          </p>
          <p>
            <span className="text-foreground font-medium">O.C.R.P. is in early development.</span>{' '}
            My goal is to make it the best community-driven original character notes
            and development app it can be — a home for your lore, your worlds, and the
            characters you can't stop thinking about.
          </p>
          <p>
            If you're an artist, digital designer, writer, or just someone who really
            cares about characters and worldbuilding and wants to help shape something
            fun and unique — please reach out. I'd love to hear from you.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild size="sm" className="glow-primary">
            <a
              href="https://instagram.com/notimportnt"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram className="w-4 h-4 mr-2" />
              @notimportnt on Instagram
            </a>
          </Button>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            <Heart className="w-4 h-4 mr-2 text-cosmic-pink" />
            Got it, thanks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
