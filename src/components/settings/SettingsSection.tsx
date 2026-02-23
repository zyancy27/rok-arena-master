import React from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  onReset?: () => void;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, onReset, children }: SettingsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-4 h-4 mr-1" /> Reset
          </Button>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
