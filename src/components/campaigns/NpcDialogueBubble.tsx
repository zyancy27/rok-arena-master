/**
 * NpcDialogueBubble
 *
 * Renders a single NPC speech bubble, visually distinct from the narrator,
 * themed by the environment via ChatBoxTheme.
 */

import { User } from 'lucide-react';
import ChatBoxTheme from '@/components/battles/ChatBoxTheme';
import type { EnvironmentTag } from '@/lib/theme-engine';
import type { SpeakerPresentationProfile } from '@/systems/chat/presentation/SpeakerPresentationProfile';

interface NpcDialogueBubbleProps {
  speakerName: string;
  dialogue: string;
  /** Environment tags for theme styling */
  tags?: EnvironmentTag[];
  /** Location string fallback */
  location?: string | null;
  presentationProfile?: SpeakerPresentationProfile | null;
}

export default function NpcDialogueBubble({
  speakerName,
  dialogue,
  tags,
  location,
  presentationProfile,
}: NpcDialogueBubbleProps) {
  const isUnknown = speakerName === '*Name Unknown*';
  const surfaceClassName = presentationProfile?.surfaceClassName ?? 'bg-accent/15 border-accent/30 text-foreground backdrop-blur-sm';
  const iconContainerClassName = presentationProfile?.iconContainerClassName ?? 'bg-accent/25 text-accent-foreground';
  const labelClassName = presentationProfile?.labelClassName ?? 'text-accent-foreground';
  const contentClassName = presentationProfile?.contentClassName ?? 'text-foreground/90';

  return (
    <ChatBoxTheme location={location} tags={tags} className="mx-2 rounded-lg animate-fade-in">
      <div className={`p-3 rounded-lg border ${surfaceClassName}`}>
        <div className="flex items-start gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconContainerClassName}`}>
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isUnknown
                  ? 'text-muted-foreground italic'
                  : labelClassName
              }`}
            >
              {speakerName}
            </span>
            <p className={`text-sm whitespace-pre-wrap break-words mt-1 ${contentClassName}`}>
              &ldquo;{dialogue}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </ChatBoxTheme>
  );
}
