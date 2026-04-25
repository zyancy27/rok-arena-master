import { useState, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { isInternalUnlocked, tryUnlockInternal } from '@/lib/internal-gate';

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function InternalGate({
  children,
  title = 'Restricted Area',
  description = 'Enter the access password to view this page.',
}: Props) {
  const [unlocked, setUnlocked] = useState(isInternalUnlocked());
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tryUnlockInternal(value)) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md bg-card-gradient border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="password"
              autoFocus
              value={value}
              placeholder="Access password"
              onChange={(e) => {
                setValue(e.target.value);
                setError(false);
              }}
            />
            {error && (
              <p className="text-sm text-destructive">Incorrect password.</p>
            )}
            <Button type="submit" className="w-full">
              Unlock
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Stays unlocked for this browser session.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
