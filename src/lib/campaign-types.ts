/**
 * Campaign Adventure Mode type definitions.
 * These mirror the database schema and provide client-side type safety.
 */

export type CampaignStatus = 'recruiting' | 'active' | 'paused' | 'completed' | 'abandoned';
export type CampaignVisibility = 'public' | 'friends' | 'private';
export type CampaignTime = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'evening' | 'night' | 'midnight';

export interface Campaign {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  current_zone: string;
  time_of_day: CampaignTime;
  day_count: number;
  difficulty_scale: number;
  average_party_level: number;
  max_players: number;
  campaign_seed: string | null;
  story_context: Record<string, unknown>;
  world_state: Record<string, unknown>;
  chosen_location: string | null;
  environment_tags: string[];
  visibility: CampaignVisibility;
  created_at: string;
  updated_at: string;
}

export interface CampaignParticipant {
  id: string;
  campaign_id: string;
  character_id: string;
  user_id: string;
  campaign_hp: number;
  campaign_hp_max: number;
  campaign_level: number;
  campaign_xp: number;
  xp_to_next_level: number;
  available_stat_points: number;
  stat_overrides: Record<string, number>;
  unlocked_abilities: string[];
  is_active: boolean;
  is_solo: boolean;
  last_active_at: string | null;
  last_read_message_id: string | null;
  last_read_at: string | null;
  power_reset_applied: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  character?: {
    name: string;
    image_url: string | null;
    level: number;
    user_id: string;
    powers: string | null;
    abilities: string | null;
    weapons_items: string | null;
    lore: string | null;
    race: string | null;
    sub_race: string | null;
    personality: string | null;
    mentality: string | null;
    stat_strength: number | null;
  };
}

export interface CampaignMessage {
  id: string;
  campaign_id: string;
  character_id: string | null;
  sender_type: 'player' | 'narrator' | 'system';
  channel: 'in_universe' | 'out_of_universe';
  content: string;
  dice_result: Record<string, unknown> | null;
  theme_snapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
  /** True while the message is being sent to the server */
  isPending?: boolean;
  // Joined
  character?: {
    name: string;
    image_url: string | null;
  };
}

export interface CampaignLog {
  id: string;
  campaign_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
}

/** XP rewards by action type */
export const XP_REWARDS = {
  combat_victory: 50,
  combat_participation: 20,
  exploration: 15,
  story_progress: 30,
  creative_action: 10,
  level_up_base: 100,
  level_up_scaling: 50, // each level adds this much to requirement
} as const;

/** Power reset: abilities available at campaign level 1 */
export const CAMPAIGN_STARTING_ABILITIES = {
  maxPowerTierAtLevel: (campaignLevel: number): number => {
    if (campaignLevel <= 2) return 1; // Common Human abilities only
    if (campaignLevel <= 5) return 2; // Enhanced Human
    if (campaignLevel <= 8) return 3; // Super Human
    if (campaignLevel <= 12) return 4; // Legend
    if (campaignLevel <= 16) return 5; // Titan
    return 6; // Logic Bending
  },
  xpForLevel: (level: number): number => {
    return XP_REWARDS.level_up_base + (level - 1) * XP_REWARDS.level_up_scaling;
  },
} as const;

/** Time progression helpers */
export const TIME_ORDER: CampaignTime[] = [
  'dawn', 'morning', 'midday', 'afternoon', 'dusk', 'evening', 'night', 'midnight',
];

export function advanceTime(current: CampaignTime, steps: number = 1): { time: CampaignTime; newDay: boolean } {
  const idx = TIME_ORDER.indexOf(current);
  const newIdx = (idx + steps) % TIME_ORDER.length;
  const newDay = newIdx < idx; // wrapped around
  return { time: TIME_ORDER[newIdx], newDay };
}

export function getTimeEmoji(time: CampaignTime): string {
  const map: Record<CampaignTime, string> = {
    dawn: '🌅',
    morning: '☀️',
    midday: '🌞',
    afternoon: '🌤️',
    dusk: '🌆',
    evening: '🌙',
    night: '🌑',
    midnight: '🕛',
  };
  return map[time];
}
