/**
 * NpcDialogueBubble
 *
 * Renders a single NPC speech bubble, visually distinct from the narrator,
 * themed by the environment via ChatBoxTheme.
 */

import { User } from 'lucide-react';
import ChatBoxTheme from '@/components/battles/ChatBoxTheme';
import type { EnvironmentTag } from '@/lib/theme-engine';

interface NpcDialogueBubbleProps {
  speakerName: string;
  dialogue: string;
  /** Environment tags for theme styling */
  tags?: EnvironmentTag[];
  /** Location string fallback */
  location?: string | null;
}

export default function NpcDialogueBubble({
  speakerName,
  dialogue,
  tags,
  location,
}: NpcDialogueBubbleProps) {
  const isUnknown = speakerName === '*Name Unknown*';

  return (
    <ChatBoxTheme location={location} tags={tags} className="mx-2 rounded-lg animate-fade-in">
      <div className="p-3 rounded-lg bg-accent/15 border border-accent/30 backdrop-blur-sm">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-full bg-accent/25 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isUnknown
                  ? 'text-muted-foreground italic'
                  : 'text-accent-foreground'
              }`}
            >
              {speakerName}
            </span>
            <p className="text-sm whitespace-pre-wrap break-words text-foreground/90 mt-1">
              &ldquo;{dialogue}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </ChatBoxTheme>
  );
}
