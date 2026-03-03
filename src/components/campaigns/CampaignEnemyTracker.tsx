/**
 * Campaign Enemy Tracker — shows active enemies with HP bars during combat.
 * Displays enemy name, tier, HP, behavior profile, and status.
 */

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Swords, Shield, Eye, Footprints, Skull } from 'lucide-react';

export interface CampaignEnemy {
  id: string;
  campaign_id: string;
  name: string;
  tier: number;
  hp: number;
  hp_max: number;
  description: string | null;
  abilities: string | null;
  weakness: string | null;
  count: number;
  status: string; // active | defeated | fled | hiding
  behavior_profile: string; // aggressive | defensive | cowardly | ambusher | tactical
  spawned_at_zone: string | null;
  spawned_at_day: number | null;
  last_action: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface CampaignEnemyTrackerProps {
  enemies: CampaignEnemy[];
}

const BEHAVIOR_ICONS: Record<string, { icon: typeof Swords; label: string; color: string }> = {
  aggressive: { icon: Swords, label: 'Aggressive', color: 'text-red-400' },
  defensive: { icon: Shield, label: 'Defensive', color: 'text-blue-400' },
  cowardly: { icon: Footprints, label: 'Cowardly', color: 'text-yellow-400' },
  ambusher: { icon: Eye, label: 'Ambusher', color: 'text-purple-400' },
  tactical: { icon: Shield, label: 'Tactical', color: 'text-cyan-400' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-red-500/20', text: 'text-red-400', label: '⚔️ In Combat' },
  defeated: { bg: 'bg-muted/30', text: 'text-muted-foreground', label: '💀 Defeated' },
  fled: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '🏃 Fled' },
  hiding: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: '👁️ Hiding' },
};

export default function CampaignEnemyTracker({ enemies }: CampaignEnemyTrackerProps) {
  const activeEnemies = enemies.filter(e => e.status === 'active' || e.status === 'hiding');
  const recentDefeated = enemies.filter(e => e.status === 'defeated' || e.status === 'fled');

  if (activeEnemies.length === 0 && recentDefeated.length === 0) return null;

  return (
    <div className="mx-3 mb-2 space-y-1.5 relative z-10">
      {/* Active enemies */}
      {activeEnemies.map(enemy => {
        const hpPercent = Math.max(0, (enemy.hp / enemy.hp_max) * 100);
        const behavior = BEHAVIOR_ICONS[enemy.behavior_profile] || BEHAVIOR_ICONS.aggressive;
        const BehaviorIcon = behavior.icon;
        const statusStyle = STATUS_STYLES[enemy.status] || STATUS_STYLES.active;
        const isHiding = enemy.status === 'hiding';

        return (
          <div
            key={enemy.id}
            className={`rounded-lg border px-3 py-2 transition-all duration-500 ${
              isHiding
                ? 'border-purple-500/30 bg-purple-500/5 opacity-70'
                : 'border-red-500/40 bg-red-500/5 animate-combat-pulse-red'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Skull className={`w-3.5 h-3.5 ${isHiding ? 'text-purple-400' : 'text-red-400'}`} />
              <span className="text-sm font-semibold truncate">{enemy.name}</span>
              {enemy.count > 1 && (
                <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-300">×{enemy.count}</Badge>
              )}
              <Badge variant="outline" className={`text-[9px] ${statusStyle.bg} ${statusStyle.text} border-0 ml-auto`}>
                {statusStyle.label}
              </Badge>
              <Badge variant="outline" className="text-[9px]">T{enemy.tier}</Badge>
            </div>

            {/* HP Bar */}
            {!isHiding && (
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1">
                  <Progress
                    value={hpPercent}
                    className="h-2"
                    style={{
                      // @ts-ignore
                      '--progress-color': hpPercent > 50 ? 'hsl(0 72% 51%)' : hpPercent > 25 ? 'hsl(25 95% 53%)' : 'hsl(0 84% 60%)',
                    } as React.CSSProperties}
                  />
                </div>
                <span className="text-[10px] text-red-300 font-mono shrink-0">
                  {Math.max(0, enemy.hp)}/{enemy.hp_max}
                </span>
              </div>
            )}

            {/* Info row */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <BehaviorIcon className={`w-3 h-3 ${behavior.color}`} />
              <span>{behavior.label}</span>
              {enemy.weakness && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="italic text-amber-400/70 truncate">Weakness: {enemy.weakness}</span>
                </>
              )}
            </div>

            {/* Last action */}
            {enemy.last_action && (
              <p className="text-[10px] text-muted-foreground/70 italic mt-0.5 truncate">
                Last: {enemy.last_action}
              </p>
            )}
          </div>
        );
      })}

      {/* Recently defeated/fled (compact) */}
      {recentDefeated.length > 0 && activeEnemies.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {recentDefeated.map(enemy => {
            const statusStyle = STATUS_STYLES[enemy.status] || STATUS_STYLES.defeated;
            return (
              <Badge
                key={enemy.id}
                variant="outline"
                className={`text-[9px] ${statusStyle.bg} ${statusStyle.text} border-0 opacity-60`}
              >
                {enemy.name} — {statusStyle.label}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
