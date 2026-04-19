/**
 * Story Orchestrator — Client-side types and helper
 *
 * The orchestrator is the central narrative brain that coordinates
 * all AI and gameplay systems into a single pipeline.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  buildNarratorConstitution,
  NARRATOR_CONSTITUTION_VERSION,
} from '@/systems/narrator/NarratorConstitution';

// ─── Types ─────────────────────────────────────────────────────

export type EventPriority = 'critical' | 'important' | 'ambient';

export interface SoundEvent {
  type: string;
  trigger_phrase: string;
  intensity?: 'soft' | 'medium' | 'loud';
}

export interface OrchestratorMeta {
  event_priority: EventPriority;
  sound_events: SoundEvent[];
  narrator_sentiment: {
    nickname: string | null;
    relationship_stage: string;
    sentiment_score: number;
    curiosity: number;
    respect: number;
    trust: number;
  } | null;
  living_world?: {
    active_events_count: number;
    rumors_count: number;
    danger_level: number;
  };
  time_update?: {
    timeBlock: string;
    day: number;
    elapsedHours: number;
  };
  npc_persist?: {
    created: number;
    updated: number;
  };
  world_state_persist?: {
    eventsCreated: number;
    eventsResolved: number;
    dangerUpdated: boolean;
    rumorsAdded: number;
  };
  faction_persist?: {
    updated: number;
  };
  gated_opportunity_persist?: {
    created: number;
    updated: number;
  };
  character_discoveries?: {
    synced: number;
    fields: string[];
  };
  pipeline_errors?: Array<{
    step: string;
    error: string;
    recoverable: boolean;
  }>;
}

/** Response from the orchestrator — extends the battle-narrator response */
export interface OrchestratedNarrationResponse {
  // Standard narrator fields
  narration?: string;
  sceneBeats?: Array<{ type: string; content: string; speaker?: string | null }> | null;
  intro?: string;
  xpGained?: number;
  hpChange?: number;
  advanceTime?: number;
  newZone?: string | null;
  encounterType?: string | null;
  sceneMap?: any;
  itemsFound?: any[];
  itemsUsed?: any[];
  npcUpdates?: any[];
  enemySpawned?: any;
  enemyUpdates?: any[];
  sentimentUpdate?: any;
  environmentalEffects?: any;

  // Orchestrator metadata
  _orchestrator: OrchestratorMeta;
}

export interface OrchestratorRequest {
  /** Pipeline type — determines which steps run */
  pipelineType: 'campaign_narration' | 'campaign_intro' | 'battle_narration' | 'battlefield_intro' | 'entrance' | 'private_query';
  /** Character ID for sentiment lookup */
  characterId?: string;
  /** Campaign ID for world state lookup */
  campaignId?: string;
  /** The original battle-narrator body (type + all fields) */
  [key: string]: any;
}

// ─── Client Helper ─────────────────────────────────────────────

/**
 * Call the story orchestrator instead of calling battle-narrator directly.
 *
 * This routes through the central pipeline which:
 * 1. Fetches world context & narrator sentiment
 * 2. Calls the battle-narrator with enriched context
 * 3. Extracts sound events from narration
 * 4. Updates sentiment in DB
 * 5. Returns a unified response with orchestrator metadata
 *
 * Falls back to calling battle-narrator directly if orchestrator fails.
 */
export async function invokeOrchestrator(
  request: OrchestratorRequest,
): Promise<{ data: OrchestratedNarrationResponse | null; error: any }> {
  try {
    const { data, error } = await supabase.functions.invoke('story-orchestrator', {
      body: request,
    });

    if (error) {
      console.warn('[Orchestrator] Failed, falling back to direct narrator call:', error);
      return fallbackToDirectNarrator(request);
    }

    return { data, error: null };
  } catch (e) {
    console.warn('[Orchestrator] Exception, falling back:', e);
    return fallbackToDirectNarrator(request);
  }
}

/** Fallback: call battle-narrator directly if orchestrator is unavailable */
async function fallbackToDirectNarrator(
  request: OrchestratorRequest,
): Promise<{ data: OrchestratedNarrationResponse | null; error: any }> {
  // Strip orchestrator-specific fields and call narrator directly
  const { pipelineType, characterId, campaignId, ...narratorBody } = request;

  const { data, error } = await supabase.functions.invoke('battle-narrator', {
    body: narratorBody,
  });

  if (error) {
    return { data: null, error };
  }

  // Wrap in orchestrator format
  return {
    data: {
      ...data,
      _orchestrator: {
        event_priority: 'ambient' as EventPriority,
        sound_events: [],
        narrator_sentiment: null,
      },
    },
    error: null,
  };
}

/**
 * Extract sound events from the orchestrator response.
 * Used by the frontend sound system to trigger synchronized audio.
 */
export function getOrchestratorSoundEvents(response: OrchestratedNarrationResponse): SoundEvent[] {
  return response._orchestrator?.sound_events || [];
}

/**
 * Check if orchestrator reported non-fatal pipeline errors.
 */
export function getOrchestratorErrors(response: OrchestratedNarrationResponse) {
  return response._orchestrator?.pipeline_errors || [];
}
