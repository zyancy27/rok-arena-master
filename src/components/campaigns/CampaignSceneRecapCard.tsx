/**
 * Campaign Scene Recap Card
 *
 * Small recap card shown when entering or re-entering a campaign.
 * Provides quick orientation: where you are, what's happening, and pressures.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, MapPin, Clock, AlertTriangle, BookOpen } from 'lucide-react';
import type { SceneRecap } from '@/lib/campaign-scene-recap';

interface CampaignSceneRecapCardProps {
  recap: SceneRecap;
  onDismiss: () => void;
}

export default function CampaignSceneRecapCard({
  recap,
  onDismiss,
}: CampaignSceneRecapCardProps) {
  return (
    <Card className="border-primary/20 bg-card/95 backdrop-blur-sm relative overflow-hidden">
      {/* Accent strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40" />

      <CardContent className="p-3 pl-4 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            Session Recap
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Location & Time */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {recap.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {recap.timeContext}
          </span>
        </div>

        {/* Situation */}
        <p className="text-xs text-foreground/80 leading-relaxed">
          {recap.situationSummary}
        </p>

        {/* Active elements */}
        {recap.activeElements.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recap.activeElements.map((el, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/20">
                {el}
              </Badge>
            ))}
          </div>
        )}

        {/* Pressures */}
        {recap.pressures.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recap.pressures.map((p, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-400">
                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                {p}
              </Badge>
            ))}
          </div>
        )}

        {/* Party status */}
        {recap.partyStatus && (
          <p className="text-[10px] text-muted-foreground">
            {recap.partyStatus}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
