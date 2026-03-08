/**
 * Campaign Stat Allocation Panel
 * Shown when a player has unspent stat points from leveling up.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sparkles, Plus, Minus, Save, Shield, Zap, Heart,
  Swords, Eye, Brain, Gauge, Star, X,
} from 'lucide-react';

interface CampaignStatAllocationProps {
  participantId: string;
  characterName: string;
  campaignLevel: number;
  availablePoints: number;
  currentOverrides: Record<string, number>;
  onComplete: () => void;
  onClose: () => void;
}

const STAT_CONFIG = [
  { key: 'vitality', label: 'Vitality', icon: Heart, color: 'text-red-400', desc: 'Health & hit points' },
  { key: 'strength', label: 'Strength', icon: Swords, color: 'text-orange-400', desc: 'Physical power & carrying' },
  { key: 'speed', label: 'Speed', icon: Zap, color: 'text-yellow-400', desc: 'Agility & reaction time' },
  { key: 'durability', label: 'Durability', icon: Shield, color: 'text-blue-400', desc: 'Endurance & resistance' },
  { key: 'perception', label: 'Perception', icon: Eye, color: 'text-green-400', desc: 'Awareness & detection' },
  { key: 'intelligence', label: 'Intelligence', icon: Brain, color: 'text-purple-400', desc: 'Reasoning & battle IQ' },
  { key: 'skill', label: 'Skill', icon: Gauge, color: 'text-cyan-400', desc: 'Control & technique' },
  { key: 'resolve', label: 'Resolve', icon: Star, color: 'text-amber-400', desc: 'Concentration & willpower' },
];

export default function CampaignStatAllocation({
  participantId,
  characterName,
  campaignLevel,
  availablePoints,
  currentOverrides,
  onComplete,
  onClose,
}: CampaignStatAllocationProps) {
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const spentPoints = Object.values(allocations).reduce((a, b) => a + b, 0);
  const remaining = availablePoints - spentPoints;

  const adjustStat = (key: string, delta: number) => {
    setAllocations(prev => {
      const current = prev[key] || 0;
      const newVal = current + delta;
      if (newVal < 0) return prev;
      if (delta > 0 && remaining <= 0) return prev;
      if (newVal === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: newVal };
    });
  };

  const handleSave = async () => {
    if (spentPoints === 0) {
      toast.error('Allocate at least one point');
      return;
    }
    setSaving(true);
    try {
      const merged: Record<string, number> = { ...currentOverrides };
      for (const [key, value] of Object.entries(allocations)) {
        merged[key] = (merged[key] || 0) + value;
      }

      const { error } = await supabase
        .from('campaign_participants')
        .update({
          stat_overrides: merged as any,
          available_stat_points: remaining,
        })
        .eq('id', participantId);

      if (error) throw error;
      toast.success(`${spentPoints} stat points allocated!${remaining > 0 ? ` ${remaining} saved for later.` : ''}`);
      onComplete();
    } catch (err) {
      console.error('Stat allocation error:', err);
      toast.error('Failed to save stats');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-amber-500/40 bg-gradient-to-b from-amber-500/5 to-background">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Level Up — {characterName}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">
            Campaign Lv.{campaignLevel}
          </Badge>
          <Badge className={`text-[10px] ${remaining > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-muted text-muted-foreground'}`}>
            {remaining} points remaining
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {STAT_CONFIG.map(stat => {
          const currentBonus = currentOverrides[stat.key] || 0;
          const pendingBonus = allocations[stat.key] || 0;
          const total = currentBonus + pendingBonus;
          const StatIcon = stat.icon;

          return (
            <div key={stat.key} className="flex items-center gap-2">
              <StatIcon className={`w-3.5 h-3.5 ${stat.color} shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium truncate">{stat.label}</span>
                  <span className="text-[10px] text-muted-foreground">+{total}</span>
                </div>
                <Progress value={Math.min(100, total * 10)} className="h-1" />
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={pendingBonus <= 0}
                  onClick={() => adjustStat(stat.key, -1)}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="text-xs font-mono w-4 text-center">
                  {pendingBonus > 0 ? `+${pendingBonus}` : '0'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={remaining <= 0}
                  onClick={() => adjustStat(stat.key, 1)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}

        <Separator className="my-1" />

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1 h-7 text-xs gap-1.5"
            disabled={saving || spentPoints === 0}
            onClick={handleSave}
          >
            <Save className="w-3 h-3" />
            Confirm ({spentPoints} spent{remaining > 0 ? `, ${remaining} saved` : ''})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onClose}
          >
            Later
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Unspent points are saved for future levels.
        </p>
      </CardContent>
    </Card>
  );
}
