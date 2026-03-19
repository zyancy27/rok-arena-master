export type CampaignResponseSuggestionIntent = 'dialogue' | 'question' | 'reaction' | 'action';
export type CampaignResponseSuggestionConfidence = 'low' | 'medium' | 'high';

export interface CampaignResponseSuggestion {
  id: string;
  label: string;
  message: string;
  detail: string;
  intent: CampaignResponseSuggestionIntent;
  confidence: CampaignResponseSuggestionConfidence;
}

interface SuggestionContextKeyInput {
  campaignId?: string | null;
  characterId?: string | null;
  currentZone?: string | null;
  timeOfDay?: string | null;
  dayCount?: number | null;
  activeEnemyNames?: string[];
  knownNpcNames?: string[];
  recentMessageKeys?: string[];
}

const MAX_SUGGESTIONS = 4;
const VALID_INTENTS: CampaignResponseSuggestionIntent[] = ['dialogue', 'question', 'reaction', 'action'];
const VALID_CONFIDENCE: CampaignResponseSuggestionConfidence[] = ['low', 'medium', 'high'];

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeIntent(value: unknown): CampaignResponseSuggestionIntent {
  return VALID_INTENTS.includes(value as CampaignResponseSuggestionIntent)
    ? (value as CampaignResponseSuggestionIntent)
    : 'dialogue';
}

function normalizeConfidence(value: unknown): CampaignResponseSuggestionConfidence {
  return VALID_CONFIDENCE.includes(value as CampaignResponseSuggestionConfidence)
    ? (value as CampaignResponseSuggestionConfidence)
    : 'medium';
}

export function normalizeCampaignResponseSuggestions(payload: unknown): CampaignResponseSuggestion[] {
  const rawSuggestions = Array.isArray((payload as { suggestions?: unknown[] } | null)?.suggestions)
    ? ((payload as { suggestions?: unknown[] }).suggestions ?? [])
    : [];

  const seen = new Set<string>();
  const normalized: CampaignResponseSuggestion[] = [];

  for (const entry of rawSuggestions) {
    const raw = entry as Record<string, unknown>;
    const label = normalizeText(raw.label ?? raw.summary ?? raw.message);
    const message = normalizeText(raw.message ?? raw.label ?? raw.summary);
    const detail = normalizeText(raw.detail ?? raw.context ?? raw.message ?? raw.label);

    if (!label || !message || !detail) continue;

    const dedupeKey = `${label.toLowerCase()}::${message.toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    normalized.push({
      id: normalizeText(raw.id) || `suggestion-${normalized.length + 1}`,
      label,
      message,
      detail,
      intent: normalizeIntent(raw.intent),
      confidence: normalizeConfidence(raw.confidence),
    });

    if (normalized.length >= MAX_SUGGESTIONS) break;
  }

  return normalized;
}

export function buildCampaignSuggestionContextKey(input: SuggestionContextKeyInput) {
  const enemyKey = (input.activeEnemyNames ?? []).map(name => name.trim().toLowerCase()).sort().join(',');
  const npcKey = (input.knownNpcNames ?? []).map(name => name.trim().toLowerCase()).sort().join(',');
  const messageKey = (input.recentMessageKeys ?? []).join('||');

  return [
    input.campaignId ?? '',
    input.characterId ?? '',
    input.currentZone ?? '',
    input.timeOfDay ?? '',
    String(input.dayCount ?? ''),
    enemyKey,
    npcKey,
    messageKey,
  ].join('::');
}
