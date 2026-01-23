import { Shield, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OwnershipNoticeProps {
  variant?: 'inline' | 'card' | 'footer';
}

export default function OwnershipNotice({ variant = 'inline' }: OwnershipNoticeProps) {
  if (variant === 'footer') {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Shield className="w-3 h-3" />
        <span>Your characters remain 100% your intellectual property.</span>
        <Link to="/terms" className="text-primary hover:underline inline-flex items-center gap-1">
          Learn more <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    );
  }
  
  if (variant === 'card') {
    return (
      <Alert className="border-primary/30 bg-primary/5">
        <Shield className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong className="text-primary">Your creations, your rights.</strong>{' '}
          All characters and ideas you create remain 100% your intellectual property. 
          By using Realm of Kings, you retain all legal rights to your original characters and concepts.{' '}
          <Link to="/terms" className="text-primary hover:underline">
            Read our full terms →
          </Link>
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <p className="text-xs text-muted-foreground flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
      <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <span>
        <strong className="text-primary">Ownership Notice:</strong> Your character is 100% owned by you. 
        All original ideas, designs, and concepts remain your intellectual property.
      </span>
    </p>
  );
}
