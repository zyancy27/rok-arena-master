/**
 * Campaign Scene Recap
 *
 * Generates a lightweight recap card when entering or re-entering a campaign.
 * Built from campaign state, recent messages, and narrator brain data.
 */

export interface SceneRecap {
  /** Current location */
  location: string;
  /** Time context */
  timeContext: string;
  /** Brief summary of what's happening */
  situationSummary: string;
  /** Key active elements */
  activeElements: string[];
  /** Any immediate pressures or hooks */
  pressures: string[];
  /** Party status if applicable */
  partyStatus?: string;
}

interface RecapInput {
  currentZone: string;
  timeOfDay: string;
  dayCount: number;
  campaignName: string;
  chosenLocation?: string | null;
  recentNarratorMessages?: string[];
  currentPressure?: string | null;
  currentArc?: string | null;
  unresolvedThreads?: string[];
  storyHooks?: string[];
  partyMembers?: string[];
  campaignHp?: number;
  campaignHpMax?: number;
  environmentTags?: string[];
}

const TIME_LABELS: Record<string, string> = {
  morning: '☀️ Morning',
  afternoon: '🌤️ Afternoon',
  evening: '🌅 Evening',
  night: '🌙 Night',
  late_night: '🌑 Late Night',
  dawn: '🌄 Dawn',
  dusk: '🌆 Dusk',
};

/**
 * Build a scene recap from campaign state.
 * This is deterministic — no AI calls needed.
 */
export function buildSceneRecap(input: RecapInput): SceneRecap {
  const location = input.chosenLocation || input.currentZone;
  const timeLabel = TIME_LABELS[input.timeOfDay] || input.timeOfDay;
  const timeContext = `Day ${input.dayCount} · ${timeLabel}`;

  // Build situation summary from recent narrator messages
  let situationSummary = `You are in ${location}.`;
  if (input.recentNarratorMessages && input.recentNarratorMessages.length > 0) {
    const lastMessage = input.recentNarratorMessages[input.recentNarratorMessages.length - 1];
    // Take first sentence of last narrator message as context
    const firstSentence = lastMessage.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 10) {
      situationSummary = firstSentence + '.';
    }
  }

  // Active elements
  const activeElements: string[] = [];
  if (input.currentArc) {
    activeElements.push(`Arc: ${input.currentArc}`);
  }
  if (input.environmentTags && input.environmentTags.length > 0) {
    activeElements.push(`Environment: ${input.environmentTags.slice(0, 3).join(', ')}`);
  }

  // Pressures
  const pressures: string[] = [];
  if (input.currentPressure) {
    pressures.push(input.currentPressure);
  }
  if (input.unresolvedThreads && input.unresolvedThreads.length > 0) {
    pressures.push(`${input.unresolvedThreads.length} unresolved thread${input.unresolvedThreads.length > 1 ? 's' : ''}`);
  }
  if (input.storyHooks && input.storyHooks.length > 0) {
    const hookPreview = typeof input.storyHooks[0] === 'string' ? input.storyHooks[0] : '';
    if (hookPreview) pressures.push(`Hook: ${hookPreview}`);
  }

  // Party status
  let partyStatus: string | undefined;
  if (input.partyMembers && input.partyMembers.length > 0) {
    partyStatus = `Party: ${input.partyMembers.join(', ')}`;
    if (input.campaignHp != null && input.campaignHpMax != null) {
      const hpPct = Math.round((input.campaignHp / input.campaignHpMax) * 100);
      partyStatus += ` · HP ${hpPct}%`;
    }
  }

  return {
    location,
    timeContext,
    situationSummary,
    activeElements,
    pressures,
    partyStatus,
  };
}
