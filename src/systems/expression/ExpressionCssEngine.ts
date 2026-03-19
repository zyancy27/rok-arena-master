/**
 * ExpressionCssEngine
 *
 * Converts an ExpressionPacket into CSS custom properties and data attributes
 * for the chat box render layer. All visuals are data-driven — JS only assigns state.
 */

import type { ExpressionPacket } from './ExpressionPacket';

/** Quantize a 0–1 float into a semantic level */
function toLevel(v: number): 'none' | 'low' | 'medium' | 'high' | 'extreme' {
  if (v <= 0.05) return 'none';
  if (v <= 0.3) return 'low';
  if (v <= 0.6) return 'medium';
  if (v <= 0.85) return 'high';
  return 'extreme';
}

/** Quantize 0–1 to a 3-step scale */
function toScale3(v: number): 'low' | 'medium' | 'high' {
  if (v <= 0.33) return 'low';
  if (v <= 0.66) return 'medium';
  return 'high';
}

export interface ExpressionDataAttributes {
  'data-expr-role': string;
  'data-expr-emotion': string;
  'data-expr-intensity': string;
  'data-expr-urgency': string;
  'data-expr-stability': string;
  'data-expr-agitation': string;
  'data-expr-dominance': string;
  'data-expr-fear': string;
  'data-expr-vocal': string;
  'data-expr-pacing': string;
  'data-expr-hesitation': string;
  'data-expr-injured': string;
  'data-expr-tired': string;
  'data-expr-unstable': string;
  'data-expr-presence': string;
  'data-expr-weight': string;
  'data-expr-biome': string;
  'data-expr-tension': string;
  'data-expr-deceptive': string;
  'data-expr-entry': string;
}

export interface ExpressionCssVars {
  '--expr-intensity': string;
  '--expr-urgency': string;
  '--expr-stability': string;
  '--expr-agitation': string;
  '--expr-dominance': string;
  '--expr-fear': string;
  '--expr-pacing': string;
  '--expr-hesitation': string;
  '--expr-injured': string;
  '--expr-tired': string;
  '--expr-presence-weight': string;
  '--expr-tension': string;
  '--expr-deception': string;
  '--expr-glow-opacity': string;
  '--expr-scale': string;
  '--expr-text-opacity': string;
}

/**
 * Derive the entry animation class based on emotion + dominance.
 */
function deriveEntryStyle(packet: ExpressionPacket): string {
  const d = packet.bodyLanguage.dominance;
  const e = packet.emotion.type;
  const fear = packet.bodyLanguage.fear;

  if (e === 'angry' && d > 0.6) return 'slam';
  if (d > 0.7) return 'snap';
  if (fear > 0.5 || e === 'fearful') return 'tremble';
  if (packet.bodyLanguage.agitation > 0.5) return 'jitter';
  if (e === 'calm' || e === 'sorrowful') return 'drift';
  return 'fade';
}

export const ExpressionCssEngine = {
  /**
   * Build data attributes for a chat box element.
   */
  toDataAttributes(packet: ExpressionPacket): ExpressionDataAttributes {
    return {
      'data-expr-role': packet.speakerRole,
      'data-expr-emotion': packet.emotion.type,
      'data-expr-intensity': toLevel(packet.emotion.intensity),
      'data-expr-urgency': toLevel(packet.bodyLanguage.urgency),
      'data-expr-stability': toScale3(packet.bodyLanguage.stability),
      'data-expr-agitation': toLevel(packet.bodyLanguage.agitation),
      'data-expr-dominance': toScale3(packet.bodyLanguage.dominance),
      'data-expr-fear': toLevel(packet.bodyLanguage.fear),
      'data-expr-vocal': packet.vocalStyle.tone,
      'data-expr-pacing': toScale3(packet.vocalStyle.pacing),
      'data-expr-hesitation': toLevel(packet.vocalStyle.hesitation),
      'data-expr-injured': toLevel(packet.physicalState.injured),
      'data-expr-tired': toLevel(packet.physicalState.tired),
      'data-expr-unstable': toLevel(packet.physicalState.unstable),
      'data-expr-presence': toScale3(packet.presence.dominance),
      'data-expr-weight': toScale3(packet.presence.weight),
      'data-expr-biome': packet.environmentInfluence.biome,
      'data-expr-tension': toScale3(packet.environmentInfluence.tension),
      'data-expr-deceptive': packet.deception.active ? 'true' : 'false',
      'data-expr-entry': deriveEntryStyle(packet),
    };
  },

  /**
   * Build CSS custom properties for fine-grained visual control.
   */
  toCssVars(packet: ExpressionPacket): ExpressionCssVars {
    const glowOpacity = Math.min(packet.emotion.intensity * 0.6, 0.5);
    const scale = 0.95 + packet.presence.weight * 0.1; // 0.95 – 1.05
    const textOpacity = Math.max(0.6, 1 - packet.physicalState.tired * 0.3 - packet.physicalState.injured * 0.1);

    return {
      '--expr-intensity': packet.emotion.intensity.toFixed(2),
      '--expr-urgency': packet.bodyLanguage.urgency.toFixed(2),
      '--expr-stability': packet.bodyLanguage.stability.toFixed(2),
      '--expr-agitation': packet.bodyLanguage.agitation.toFixed(2),
      '--expr-dominance': packet.bodyLanguage.dominance.toFixed(2),
      '--expr-fear': packet.bodyLanguage.fear.toFixed(2),
      '--expr-pacing': packet.vocalStyle.pacing.toFixed(2),
      '--expr-hesitation': packet.vocalStyle.hesitation.toFixed(2),
      '--expr-injured': packet.physicalState.injured.toFixed(2),
      '--expr-tired': packet.physicalState.tired.toFixed(2),
      '--expr-presence-weight': packet.presence.weight.toFixed(2),
      '--expr-tension': packet.environmentInfluence.tension.toFixed(2),
      '--expr-deception': packet.deception.severity.toFixed(2),
      '--expr-glow-opacity': glowOpacity.toFixed(2),
      '--expr-scale': scale.toFixed(3),
      '--expr-text-opacity': textOpacity.toFixed(2),
    };
  },

  /**
   * Build both data attributes and CSS vars for direct spread onto an element.
   */
  toProps(packet: ExpressionPacket): {
    dataAttributes: ExpressionDataAttributes;
    cssVars: ExpressionCssVars;
    entryClassName: string;
  } {
    const entry = deriveEntryStyle(packet);
    return {
      dataAttributes: this.toDataAttributes(packet),
      cssVars: this.toCssVars(packet),
      entryClassName: `expr-entry-${entry}`,
    };
  },
};
