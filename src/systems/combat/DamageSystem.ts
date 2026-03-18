import type { Intent } from '@/systems/intent/IntentEngine';
import type { ResolvedCharacterContext } from '@/systems/character/CharacterContextResolver';
import { fromDistanceZone, pairKey, toDistanceZone, type CombatState, type CombatStatusEffectState } from './CombatState';

export type DamageType = 'physical' | 'mental' | 'energy' | 'environmental';
export type SeverityLevel = 'light' | 'moderate' | 'heavy' | 'devastating';

export interface DamageEffect {
  type: 'bleed' | 'stagger' | 'knockback';
  intensity: number;
  duration: number;
}

export interface DamageResult {
  amount: number;
  hpDamage: number;
  staminaCost: number;
  damageType: DamageType;
  severity: SeverityLevel;
  effects: DamageEffect[];
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function average(...values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function determineDamageType(intent: Intent): DamageType {
  const text = intent.rawText.toLowerCase();
  if (/\b(mental|mind|psychic|telepath|illusion|memory|fear)\b/.test(text)) return 'mental';
  if (/\b(beam|blast|energy|fire|ice|lightning|force|ki|magic)\b/.test(text)) return 'energy';
  return 'physical';
}

function determineSeverity(amount: number): SeverityLevel {
  if (amount >= 30) return 'devastating';
  if (amount >= 20) return 'heavy';
  if (amount >= 10) return 'moderate';
  return 'light';
}

function deriveEffects(intent: Intent, amount: number, severity: SeverityLevel): DamageEffect[] {
  const text = intent.rawText.toLowerCase();
  const effects: DamageEffect[] = [];

  if (/\b(slash|stab|cut|pierce|claw|blade|sword|knife)\b/.test(text)) {
    effects.push({ type: 'bleed', intensity: clamp(Math.round(amount / 4), 1, 10), duration: severity === 'devastating' ? 4 : 3 });
  }

  if (severity === 'heavy' || severity === 'devastating' || /\b(slam|smash|bash|hammer|shockwave|punch|kick)\b/.test(text)) {
    effects.push({ type: 'stagger', intensity: clamp(Math.round(amount / 5), 1, 10), duration: severity === 'devastating' ? 3 : 2 });
  }

  if (severity === 'devastating' || /\b(knock|launch|throw|blast|burst|send flying|explosion)\b/.test(text)) {
    effects.push({ type: 'knockback', intensity: clamp(Math.round(amount / 6), 1, 10), duration: 1 });
  }

  return effects;
}

function mergeStatusEffects(existing: CombatStatusEffectState[], incoming: DamageEffect[]): CombatStatusEffectState[] {
  const next = existing.map(effect => ({ ...effect }));

  for (const effect of incoming) {
    const match = next.find(current => current.type === effect.type);
    if (match) {
      match.duration = Math.max(match.duration ?? 0, effect.duration);
      match.intensity = typeof match.intensity === 'number'
        ? Math.max(match.intensity, effect.intensity)
        : effect.intensity;
      continue;
    }

    next.push({
      type: effect.type,
      intensity: effect.intensity,
      duration: effect.duration,
    });
  }

  return next;
}

export const DamageSystem = {
  calculate(intent: Intent, actor: ResolvedCharacterContext, target: ResolvedCharacterContext | null, outcome: 'hit' | 'partial_hit' | 'miss' | 'block' | 'dodge' | 'interrupt', gap: number): DamageResult | null {
    if (outcome !== 'hit' && outcome !== 'partial_hit') return null;

    const attackStat = intent.type === 'ability'
      ? average(actor.stats.stat_power, actor.stats.stat_skill, actor.stats.stat_intelligence)
      : average(actor.stats.stat_strength, actor.stats.stat_skill, actor.stats.stat_battle_iq);
    const defenseStat = target
      ? average(target.stats.stat_durability, target.stats.stat_stamina, target.stats.stat_speed)
      : 50;
    const intensity = intent.intensity ?? 50;
    const rawAmount = (outcome === 'hit' ? 8 : 5) + (attackStat - defenseStat) / 8 + intensity / 7 + Math.max(0, gap) / 2.5;
    const amount = clamp(Math.round(rawAmount), 1, 40);
    const severity = determineSeverity(amount);
    const effects = deriveEffects(intent, amount, severity);

    return {
      amount,
      hpDamage: amount,
      staminaCost: clamp(Math.round(intensity / 6 + (outcome === 'hit' ? 6 : 4)), 3, 20),
      damageType: determineDamageType(intent),
      severity,
      effects,
    };
  },

  apply(state: CombatState, actorId: string, targetId: string | null | undefined, damage: DamageResult | null) {
    if (!damage) return state;
    if (!targetId || !state.participants[targetId]) return state;

    const target = state.participants[targetId];
    const actor = state.participants[actorId];
    target.stats.hp = Math.max(0, target.stats.hp - damage.hpDamage);
    actor.stats.stamina = Math.max(0, actor.stats.stamina - damage.staminaCost);
    target.statusEffects = mergeStatusEffects(target.statusEffects, damage.effects);

    if (damage.effects.some(effect => effect.type === 'knockback') && actor && target) {
      const distance = state.distances[pairKey(actorId, targetId)];
      if (distance) {
        const bumpedRange = distance.range === 'close' ? 'mid' : 'far';
        distance.range = bumpedRange;
        distance.zoneLabel = toDistanceZone(bumpedRange);
        distance.meters = bumpedRange === 'mid' ? 8 : 24;
        target.position.range = fromDistanceZone(distance.zoneLabel);
        target.position.meters = distance.meters;
      }
    }

    return state;
  },
};
