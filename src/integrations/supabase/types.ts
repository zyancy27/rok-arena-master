export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      battle_invitations: {
        Row: {
          battle_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          battle_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          battle_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_invitations_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_messages: {
        Row: {
          battle_id: string
          channel: Database["public"]["Enums"]["message_channel"]
          character_id: string
          content: string
          created_at: string
          id: string
          theme_snapshot: Json | null
        }
        Insert: {
          battle_id: string
          channel?: Database["public"]["Enums"]["message_channel"]
          character_id: string
          content: string
          created_at?: string
          id?: string
          theme_snapshot?: Json | null
        }
        Update: {
          battle_id?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          character_id?: string
          content?: string
          created_at?: string
          id?: string
          theme_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_messages_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_messages_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_messages_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_participants: {
        Row: {
          battle_id: string
          character_id: string
          character_snapshot: Json | null
          created_at: string
          id: string
          is_typing: boolean
          last_read_at: string | null
          last_read_message_id: string | null
          last_typed_at: string | null
          scene_effect_tags: Json | null
          scene_location: string | null
          scene_tags: Json | null
          turn_order: number
        }
        Insert: {
          battle_id: string
          character_id: string
          character_snapshot?: Json | null
          created_at?: string
          id?: string
          is_typing?: boolean
          last_read_at?: string | null
          last_read_message_id?: string | null
          last_typed_at?: string | null
          scene_effect_tags?: Json | null
          scene_location?: string | null
          scene_tags?: Json | null
          turn_order?: number
        }
        Update: {
          battle_id?: string
          character_id?: string
          character_snapshot?: Json | null
          created_at?: string
          id?: string
          is_typing?: boolean
          last_read_at?: string | null
          last_read_message_id?: string | null
          last_typed_at?: string | null
          scene_effect_tags?: Json | null
          scene_location?: string | null
          scene_tags?: Json | null
          turn_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "battle_participants_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_participants_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_participants_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      battles: {
        Row: {
          battle_mode: string
          challenged_user_id: string | null
          chosen_location: string | null
          coin_flip_winner_id: string | null
          concentration_uses: Json | null
          created_at: string
          dynamic_environment: boolean
          emergency_enabled: boolean
          emergency_payload: Json | null
          emergency_seed: string | null
          environment_effects: string | null
          has_shown_arena_intro: boolean
          id: string
          location_1: string | null
          location_2: string | null
          location_base: string | null
          location_confirmed_by_host: boolean
          loser_id: string | null
          max_players: number
          planet_id: string | null
          planet_name: string | null
          status: Database["public"]["Enums"]["battle_status"]
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          battle_mode?: string
          challenged_user_id?: string | null
          chosen_location?: string | null
          coin_flip_winner_id?: string | null
          concentration_uses?: Json | null
          created_at?: string
          dynamic_environment?: boolean
          emergency_enabled?: boolean
          emergency_payload?: Json | null
          emergency_seed?: string | null
          environment_effects?: string | null
          has_shown_arena_intro?: boolean
          id?: string
          location_1?: string | null
          location_2?: string | null
          location_base?: string | null
          location_confirmed_by_host?: boolean
          loser_id?: string | null
          max_players?: number
          planet_id?: string | null
          planet_name?: string | null
          status?: Database["public"]["Enums"]["battle_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          battle_mode?: string
          challenged_user_id?: string | null
          chosen_location?: string | null
          coin_flip_winner_id?: string | null
          concentration_uses?: Json | null
          created_at?: string
          dynamic_environment?: boolean
          emergency_enabled?: boolean
          emergency_payload?: Json | null
          emergency_seed?: string | null
          environment_effects?: string | null
          has_shown_arena_intro?: boolean
          id?: string
          location_1?: string | null
          location_2?: string | null
          location_base?: string | null
          location_confirmed_by_host?: boolean
          loser_id?: string | null
          max_players?: number
          planet_id?: string | null
          planet_name?: string | null
          status?: Database["public"]["Enums"]["battle_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battles_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_planet_id_fkey"
            columns: ["planet_id"]
            isOneToOne: false
            referencedRelation: "planet_customizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_brain: {
        Row: {
          active_story_beats: Json
          campaign_id: string
          campaign_length_target: string
          campaign_objective: string | null
          consequence_summary: Json
          core_storyline: string | null
          created_at: string
          current_arc: string | null
          current_day: number
          current_location: string | null
          current_pressure: string | null
          current_time_block: string
          elapsed_hours: number
          faction_state: Json
          failure_conditions: Json
          future_pressures: Json
          gated_opportunities: Json
          genre: string | null
          hidden_truths: Json
          id: string
          known_truths: Json
          major_arcs: Json
          narrator_constitution_version: string | null
          npc_roster_summary: Json
          opening_hook: string | null
          player_impact_log: Json
          premise: string
          region_moods: Json
          regional_social_heat: Json
          remaining_narrative_runway: string | null
          rhythm_profile: Json
          story_hooks: Json
          tone: string | null
          unresolved_threads: Json
          updated_at: string
          victory_conditions: Json
          world_summary: string | null
        }
        Insert: {
          active_story_beats?: Json
          campaign_id: string
          campaign_length_target?: string
          campaign_objective?: string | null
          consequence_summary?: Json
          core_storyline?: string | null
          created_at?: string
          current_arc?: string | null
          current_day?: number
          current_location?: string | null
          current_pressure?: string | null
          current_time_block?: string
          elapsed_hours?: number
          faction_state?: Json
          failure_conditions?: Json
          future_pressures?: Json
          gated_opportunities?: Json
          genre?: string | null
          hidden_truths?: Json
          id?: string
          known_truths?: Json
          major_arcs?: Json
          narrator_constitution_version?: string | null
          npc_roster_summary?: Json
          opening_hook?: string | null
          player_impact_log?: Json
          premise?: string
          region_moods?: Json
          regional_social_heat?: Json
          remaining_narrative_runway?: string | null
          rhythm_profile?: Json
          story_hooks?: Json
          tone?: string | null
          unresolved_threads?: Json
          updated_at?: string
          victory_conditions?: Json
          world_summary?: string | null
        }
        Update: {
          active_story_beats?: Json
          campaign_id?: string
          campaign_length_target?: string
          campaign_objective?: string | null
          consequence_summary?: Json
          core_storyline?: string | null
          created_at?: string
          current_arc?: string | null
          current_day?: number
          current_location?: string | null
          current_pressure?: string | null
          current_time_block?: string
          elapsed_hours?: number
          faction_state?: Json
          failure_conditions?: Json
          future_pressures?: Json
          gated_opportunities?: Json
          genre?: string | null
          hidden_truths?: Json
          id?: string
          known_truths?: Json
          major_arcs?: Json
          narrator_constitution_version?: string | null
          npc_roster_summary?: Json
          opening_hook?: string | null
          player_impact_log?: Json
          premise?: string
          region_moods?: Json
          regional_social_heat?: Json
          remaining_narrative_runway?: string | null
          rhythm_profile?: Json
          story_hooks?: Json
          tone?: string | null
          unresolved_threads?: Json
          updated_at?: string
          victory_conditions?: Json
          world_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_brain_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_enemies: {
        Row: {
          abilities: string | null
          behavior_profile: string | null
          campaign_id: string
          count: number
          created_at: string
          description: string | null
          hp: number
          hp_max: number
          id: string
          last_action: string | null
          metadata: Json | null
          name: string
          spawned_at_day: number | null
          spawned_at_zone: string | null
          status: string
          tier: number
          updated_at: string
          weakness: string | null
        }
        Insert: {
          abilities?: string | null
          behavior_profile?: string | null
          campaign_id: string
          count?: number
          created_at?: string
          description?: string | null
          hp: number
          hp_max: number
          id?: string
          last_action?: string | null
          metadata?: Json | null
          name: string
          spawned_at_day?: number | null
          spawned_at_zone?: string | null
          status?: string
          tier?: number
          updated_at?: string
          weakness?: string | null
        }
        Update: {
          abilities?: string | null
          behavior_profile?: string | null
          campaign_id?: string
          count?: number
          created_at?: string
          description?: string | null
          hp?: number
          hp_max?: number
          id?: string
          last_action?: string | null
          metadata?: Json | null
          name?: string
          spawned_at_day?: number | null
          spawned_at_zone?: string | null
          status?: string
          tier?: number
          updated_at?: string
          weakness?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_enemies_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_inventory: {
        Row: {
          campaign_id: string
          created_at: string
          description: string | null
          found_at_day: number | null
          found_at_zone: string | null
          id: string
          is_equipped: boolean
          item_name: string
          item_rarity: string
          item_type: string
          participant_id: string
          stat_bonus: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description?: string | null
          found_at_day?: number | null
          found_at_zone?: string | null
          id?: string
          is_equipped?: boolean
          item_name: string
          item_rarity?: string
          item_type?: string
          participant_id: string
          stat_bonus?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string | null
          found_at_day?: number | null
          found_at_zone?: string | null
          id?: string
          is_equipped?: boolean
          item_name?: string
          item_rarity?: string
          item_type?: string
          participant_id?: string
          stat_bonus?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_inventory_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_inventory_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "campaign_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_join_requests: {
        Row: {
          campaign_id: string
          character_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          character_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          character_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_join_requests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_join_requests_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_join_requests_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_location_state: {
        Row: {
          campaign_id: string
          control_description: string | null
          control_type: string | null
          controlled_by: string | null
          created_at: string
          environmental_friction: Json
          familiarity_level: number
          id: string
          last_visited_day: number | null
          local_habits: Json
          location_mood: string | null
          notable_features: string[] | null
          quiet_scene_value: Json
          scene_residue: Json
          times_visited: number
          updated_at: string
          zone_name: string
        }
        Insert: {
          campaign_id: string
          control_description?: string | null
          control_type?: string | null
          controlled_by?: string | null
          created_at?: string
          environmental_friction?: Json
          familiarity_level?: number
          id?: string
          last_visited_day?: number | null
          local_habits?: Json
          location_mood?: string | null
          notable_features?: string[] | null
          quiet_scene_value?: Json
          scene_residue?: Json
          times_visited?: number
          updated_at?: string
          zone_name: string
        }
        Update: {
          campaign_id?: string
          control_description?: string | null
          control_type?: string | null
          controlled_by?: string | null
          created_at?: string
          environmental_friction?: Json
          familiarity_level?: number
          id?: string
          last_visited_day?: number | null
          local_habits?: Json
          location_mood?: string | null
          notable_features?: string[] | null
          quiet_scene_value?: Json
          scene_residue?: Json
          times_visited?: number
          updated_at?: string
          zone_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_location_state_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_logs: {
        Row: {
          campaign_id: string
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_messages: {
        Row: {
          campaign_id: string
          channel: string
          character_id: string | null
          content: string
          created_at: string
          dice_result: Json | null
          id: string
          metadata: Json | null
          sender_type: string
          theme_snapshot: Json | null
        }
        Insert: {
          campaign_id: string
          channel?: string
          character_id?: string | null
          content: string
          created_at?: string
          dice_result?: Json | null
          id?: string
          metadata?: Json | null
          sender_type?: string
          theme_snapshot?: Json | null
        }
        Update: {
          campaign_id?: string
          channel?: string
          character_id?: string | null
          content?: string
          created_at?: string
          dice_result?: Json | null
          id?: string
          metadata?: Json | null
          sender_type?: string
          theme_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_npcs: {
        Row: {
          age_range: string | null
          appearance: string | null
          backstory: string | null
          campaign_id: string
          created_at: string
          current_zone: string | null
          emotional_memory: Json
          emotional_tone: string | null
          faction_ties: Json
          fears: Json
          first_met_day: number
          first_name: string | null
          full_name: string | null
          gender_presentation: string | null
          goals: Json
          home_zone: string | null
          id: string
          is_chaotic: boolean
          is_outgoing: boolean
          knows_key_facts: Json
          last_emotional_shift: string | null
          last_seen_day: number | null
          likely_to_initiate: boolean
          memory_summary: string | null
          metadata: Json | null
          mobility: string
          name: string
          notable_hooks: Json
          npc_current_activity: string | null
          npc_goal: string | null
          npc_motivation: string | null
          npc_relationships: Json
          occupation: string | null
          personality: string | null
          personality_traits: Json
          relationship_summary: string | null
          role: string
          secrets: Json
          social_ties: Json
          status: string
          story_relevance_level: string
          temperament: string | null
          title_honorific: string | null
          trust_disposition: number
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          appearance?: string | null
          backstory?: string | null
          campaign_id: string
          created_at?: string
          current_zone?: string | null
          emotional_memory?: Json
          emotional_tone?: string | null
          faction_ties?: Json
          fears?: Json
          first_met_day?: number
          first_name?: string | null
          full_name?: string | null
          gender_presentation?: string | null
          goals?: Json
          home_zone?: string | null
          id?: string
          is_chaotic?: boolean
          is_outgoing?: boolean
          knows_key_facts?: Json
          last_emotional_shift?: string | null
          last_seen_day?: number | null
          likely_to_initiate?: boolean
          memory_summary?: string | null
          metadata?: Json | null
          mobility?: string
          name: string
          notable_hooks?: Json
          npc_current_activity?: string | null
          npc_goal?: string | null
          npc_motivation?: string | null
          npc_relationships?: Json
          occupation?: string | null
          personality?: string | null
          personality_traits?: Json
          relationship_summary?: string | null
          role?: string
          secrets?: Json
          social_ties?: Json
          status?: string
          story_relevance_level?: string
          temperament?: string | null
          title_honorific?: string | null
          trust_disposition?: number
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          appearance?: string | null
          backstory?: string | null
          campaign_id?: string
          created_at?: string
          current_zone?: string | null
          emotional_memory?: Json
          emotional_tone?: string | null
          faction_ties?: Json
          fears?: Json
          first_met_day?: number
          first_name?: string | null
          full_name?: string | null
          gender_presentation?: string | null
          goals?: Json
          home_zone?: string | null
          id?: string
          is_chaotic?: boolean
          is_outgoing?: boolean
          knows_key_facts?: Json
          last_emotional_shift?: string | null
          last_seen_day?: number | null
          likely_to_initiate?: boolean
          memory_summary?: string | null
          metadata?: Json | null
          mobility?: string
          name?: string
          notable_hooks?: Json
          npc_current_activity?: string | null
          npc_goal?: string | null
          npc_motivation?: string | null
          npc_relationships?: Json
          occupation?: string | null
          personality?: string | null
          personality_traits?: Json
          relationship_summary?: string | null
          role?: string
          secrets?: Json
          social_ties?: Json
          status?: string
          story_relevance_level?: string
          temperament?: string | null
          title_honorific?: string | null
          trust_disposition?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_npcs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_participants: {
        Row: {
          available_stat_points: number
          campaign_hp: number
          campaign_hp_max: number
          campaign_id: string
          campaign_level: number
          campaign_xp: number
          character_id: string
          created_at: string
          id: string
          is_active: boolean
          is_solo: boolean
          is_typing: boolean
          last_active_at: string | null
          last_read_at: string | null
          last_read_message_id: string | null
          last_typed_at: string | null
          power_reset_applied: boolean
          stat_overrides: Json | null
          unlocked_abilities: Json | null
          updated_at: string
          user_id: string
          xp_to_next_level: number
        }
        Insert: {
          available_stat_points?: number
          campaign_hp?: number
          campaign_hp_max?: number
          campaign_id: string
          campaign_level?: number
          campaign_xp?: number
          character_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_solo?: boolean
          is_typing?: boolean
          last_active_at?: string | null
          last_read_at?: string | null
          last_read_message_id?: string | null
          last_typed_at?: string | null
          power_reset_applied?: boolean
          stat_overrides?: Json | null
          unlocked_abilities?: Json | null
          updated_at?: string
          user_id: string
          xp_to_next_level?: number
        }
        Update: {
          available_stat_points?: number
          campaign_hp?: number
          campaign_hp_max?: number
          campaign_id?: string
          campaign_level?: number
          campaign_xp?: number
          character_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_solo?: boolean
          is_typing?: boolean
          last_active_at?: string | null
          last_read_at?: string | null
          last_read_message_id?: string | null
          last_typed_at?: string | null
          power_reset_applied?: boolean
          stat_overrides?: Json | null
          unlocked_abilities?: Json | null
          updated_at?: string
          user_id?: string
          xp_to_next_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_trades: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          item_id: string
          message: string | null
          receiver_participant_id: string
          sender_participant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          item_id: string
          message?: string | null
          receiver_participant_id: string
          sender_participant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          item_id?: string
          message?: string | null
          receiver_participant_id?: string
          sender_participant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_trades_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_trades_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "campaign_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_trades_receiver_participant_id_fkey"
            columns: ["receiver_participant_id"]
            isOneToOne: false
            referencedRelation: "campaign_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_trades_sender_participant_id_fkey"
            columns: ["sender_participant_id"]
            isOneToOne: false
            referencedRelation: "campaign_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_turn_logs: {
        Row: {
          campaign_id: string
          character_id: string | null
          consequence_deltas: Json | null
          created_at: string
          day_number: number
          hook_deltas: Json | null
          id: string
          map_delta: Json | null
          npc_deltas: Json | null
          opportunity_deltas: Json | null
          parsed_intent: Json | null
          promoted: boolean
          promoted_at: string | null
          promotion_notes: string | null
          raw_input: string
          resolved_action: Json | null
          roll_result: Json | null
          scene_beat_summary: string | null
          time_advance: number | null
          time_block: string | null
          turn_number: number
          user_id: string
          zone: string | null
        }
        Insert: {
          campaign_id: string
          character_id?: string | null
          consequence_deltas?: Json | null
          created_at?: string
          day_number?: number
          hook_deltas?: Json | null
          id?: string
          map_delta?: Json | null
          npc_deltas?: Json | null
          opportunity_deltas?: Json | null
          parsed_intent?: Json | null
          promoted?: boolean
          promoted_at?: string | null
          promotion_notes?: string | null
          raw_input: string
          resolved_action?: Json | null
          roll_result?: Json | null
          scene_beat_summary?: string | null
          time_advance?: number | null
          time_block?: string | null
          turn_number?: number
          user_id: string
          zone?: string | null
        }
        Update: {
          campaign_id?: string
          character_id?: string | null
          consequence_deltas?: Json | null
          created_at?: string
          day_number?: number
          hook_deltas?: Json | null
          id?: string
          map_delta?: Json | null
          npc_deltas?: Json | null
          opportunity_deltas?: Json | null
          parsed_intent?: Json | null
          promoted?: boolean
          promoted_at?: string | null
          promotion_notes?: string | null
          raw_input?: string
          resolved_action?: Json | null
          roll_result?: Json | null
          scene_beat_summary?: string | null
          time_advance?: number | null
          time_block?: string | null
          turn_number?: number
          user_id?: string
          zone?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          abandonment_reason: string | null
          average_party_level: number
          campaign_length: string
          campaign_seed: string | null
          chosen_location: string | null
          created_at: string
          creator_id: string
          current_zone: string
          day_count: number
          description: string | null
          difficulty_scale: number
          do_not_learn: boolean
          elapsed_hours: number
          environment_tags: Json | null
          genre: string | null
          id: string
          max_players: number
          name: string
          status: Database["public"]["Enums"]["campaign_status"]
          story_context: Json | null
          time_of_day: Database["public"]["Enums"]["campaign_time"]
          tone: string | null
          updated_at: string
          visibility: string
          world_state: Json | null
        }
        Insert: {
          abandonment_reason?: string | null
          average_party_level?: number
          campaign_length?: string
          campaign_seed?: string | null
          chosen_location?: string | null
          created_at?: string
          creator_id: string
          current_zone?: string
          day_count?: number
          description?: string | null
          difficulty_scale?: number
          do_not_learn?: boolean
          elapsed_hours?: number
          environment_tags?: Json | null
          genre?: string | null
          id?: string
          max_players?: number
          name: string
          status?: Database["public"]["Enums"]["campaign_status"]
          story_context?: Json | null
          time_of_day?: Database["public"]["Enums"]["campaign_time"]
          tone?: string | null
          updated_at?: string
          visibility?: string
          world_state?: Json | null
        }
        Update: {
          abandonment_reason?: string | null
          average_party_level?: number
          campaign_length?: string
          campaign_seed?: string | null
          chosen_location?: string | null
          created_at?: string
          creator_id?: string
          current_zone?: string
          day_count?: number
          description?: string | null
          difficulty_scale?: number
          do_not_learn?: boolean
          elapsed_hours?: number
          environment_tags?: Json | null
          genre?: string | null
          id?: string
          max_players?: number
          name?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          story_context?: Json | null
          time_of_day?: Database["public"]["Enums"]["campaign_time"]
          tone?: string | null
          updated_at?: string
          visibility?: string
          world_state?: Json | null
        }
        Relationships: []
      }
      character_3d_configs: {
        Row: {
          character_id: string
          created_at: string
          current_status: Database["public"]["Enums"]["generation_status"]
          height_morph: number
          id: string
          model_glb_url: string | null
          motion_mode: Database["public"]["Enums"]["motion_mode"]
          preview_url: string | null
          quality: Database["public"]["Enums"]["model_quality"]
          shoulders_morph: number
          template: Database["public"]["Enums"]["character_template"]
          updated_at: string
          visual_style: Database["public"]["Enums"]["visual_style"]
        }
        Insert: {
          character_id: string
          created_at?: string
          current_status?: Database["public"]["Enums"]["generation_status"]
          height_morph?: number
          id?: string
          model_glb_url?: string | null
          motion_mode?: Database["public"]["Enums"]["motion_mode"]
          preview_url?: string | null
          quality?: Database["public"]["Enums"]["model_quality"]
          shoulders_morph?: number
          template?: Database["public"]["Enums"]["character_template"]
          updated_at?: string
          visual_style?: Database["public"]["Enums"]["visual_style"]
        }
        Update: {
          character_id?: string
          created_at?: string
          current_status?: Database["public"]["Enums"]["generation_status"]
          height_morph?: number
          id?: string
          model_glb_url?: string | null
          motion_mode?: Database["public"]["Enums"]["motion_mode"]
          preview_url?: string | null
          quality?: Database["public"]["Enums"]["model_quality"]
          shoulders_morph?: number
          template?: Database["public"]["Enums"]["character_template"]
          updated_at?: string
          visual_style?: Database["public"]["Enums"]["visual_style"]
        }
        Relationships: [
          {
            foreignKeyName: "character_3d_configs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_3d_configs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      character_ai_notes: {
        Row: {
          battle_id: string | null
          category: string
          character_id: string
          created_at: string
          id: string
          note: string
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          battle_id?: string | null
          category: string
          character_id: string
          created_at?: string
          id?: string
          note: string
          scope?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          battle_id?: string | null
          category?: string
          character_id?: string
          created_at?: string
          id?: string
          note?: string
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_ai_notes_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_ai_notes_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_ai_notes_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      character_constructs: {
        Row: {
          behavior_summary: string | null
          character_id: string
          construct_type: string
          created_at: string
          durability_level: string
          durability_numeric: number | null
          id: string
          limitations: string | null
          name: string
          persistence: string
          updated_at: string
          user_id: string
        }
        Insert: {
          behavior_summary?: string | null
          character_id: string
          construct_type?: string
          created_at?: string
          durability_level?: string
          durability_numeric?: number | null
          id?: string
          limitations?: string | null
          name: string
          persistence?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          behavior_summary?: string | null
          character_id?: string
          construct_type?: string
          created_at?: string
          durability_level?: string
          durability_numeric?: number | null
          id?: string
          limitations?: string | null
          name?: string
          persistence?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_constructs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_constructs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      character_group_members: {
        Row: {
          character_id: string
          created_at: string
          group_id: string
          id: string
        }
        Insert: {
          character_id: string
          created_at?: string
          group_id: string
          id?: string
        }
        Update: {
          character_id?: string
          created_at?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_group_members_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_group_members_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "character_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      character_groups: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      character_images: {
        Row: {
          character_id: string
          created_at: string
          display_order: number
          id: string
          image_url: string
          role: Database["public"]["Enums"]["image_role"]
          storage_path: string
        }
        Insert: {
          character_id: string
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          role?: Database["public"]["Enums"]["image_role"]
          storage_path: string
        }
        Update: {
          character_id?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          role?: Database["public"]["Enums"]["image_role"]
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_images_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_images_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      character_sections: {
        Row: {
          body: string
          character_id: string
          created_at: string | null
          id: string
          sort_order: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          character_id: string
          created_at?: string | null
          id?: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          character_id?: string
          created_at?: string | null
          id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_sections_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_sections_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      character_timeline_events: {
        Row: {
          age_or_year: string
          character_id: string
          created_at: string
          emotional_weight: number
          event_description: string
          event_title: string
          id: string
          origin_id: string | null
          origin_type: string
          sort_order: number
          tags: string[]
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          age_or_year?: string
          character_id: string
          created_at?: string
          emotional_weight?: number
          event_description?: string
          event_title?: string
          id?: string
          origin_id?: string | null
          origin_type?: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          age_or_year?: string
          character_id?: string
          created_at?: string
          emotional_weight?: number
          event_description?: string
          event_title?: string
          id?: string
          origin_id?: string | null
          origin_type?: string
          sort_order?: number
          tags?: string[]
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_timeline_events_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_timeline_events_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          abilities: string | null
          age: number | null
          appearance_aura: string | null
          appearance_build: string | null
          appearance_clothing_style: string | null
          appearance_description: string | null
          appearance_distinct_features: string | null
          appearance_eyes: string | null
          appearance_hair: string | null
          appearance_height: string | null
          appearance_movement_style: string | null
          appearance_posture: string | null
          appearance_typical_expression: string | null
          appearance_voice: string | null
          created_at: string
          home_moon: string | null
          home_planet: string | null
          id: string
          image_url: string | null
          level: number
          lore: string | null
          mentality: string | null
          name: string
          personality: string | null
          powers: string | null
          race: string | null
          race_id: string | null
          sex: string | null
          solar_system_id: string | null
          stat_battle_iq: number | null
          stat_durability: number | null
          stat_intelligence: number | null
          stat_luck: number | null
          stat_power: number | null
          stat_skill: number | null
          stat_speed: number | null
          stat_stamina: number | null
          stat_strength: number | null
          sub_race: string | null
          updated_at: string
          user_id: string
          weapons_items: string | null
        }
        Insert: {
          abilities?: string | null
          age?: number | null
          appearance_aura?: string | null
          appearance_build?: string | null
          appearance_clothing_style?: string | null
          appearance_description?: string | null
          appearance_distinct_features?: string | null
          appearance_eyes?: string | null
          appearance_hair?: string | null
          appearance_height?: string | null
          appearance_movement_style?: string | null
          appearance_posture?: string | null
          appearance_typical_expression?: string | null
          appearance_voice?: string | null
          created_at?: string
          home_moon?: string | null
          home_planet?: string | null
          id?: string
          image_url?: string | null
          level: number
          lore?: string | null
          mentality?: string | null
          name: string
          personality?: string | null
          powers?: string | null
          race?: string | null
          race_id?: string | null
          sex?: string | null
          solar_system_id?: string | null
          stat_battle_iq?: number | null
          stat_durability?: number | null
          stat_intelligence?: number | null
          stat_luck?: number | null
          stat_power?: number | null
          stat_skill?: number | null
          stat_speed?: number | null
          stat_stamina?: number | null
          stat_strength?: number | null
          sub_race?: string | null
          updated_at?: string
          user_id: string
          weapons_items?: string | null
        }
        Update: {
          abilities?: string | null
          age?: number | null
          appearance_aura?: string | null
          appearance_build?: string | null
          appearance_clothing_style?: string | null
          appearance_description?: string | null
          appearance_distinct_features?: string | null
          appearance_eyes?: string | null
          appearance_hair?: string | null
          appearance_height?: string | null
          appearance_movement_style?: string | null
          appearance_posture?: string | null
          appearance_typical_expression?: string | null
          appearance_voice?: string | null
          created_at?: string
          home_moon?: string | null
          home_planet?: string | null
          id?: string
          image_url?: string | null
          level?: number
          lore?: string | null
          mentality?: string | null
          name?: string
          personality?: string | null
          powers?: string | null
          race?: string | null
          race_id?: string | null
          sex?: string | null
          solar_system_id?: string | null
          stat_battle_iq?: number | null
          stat_durability?: number | null
          stat_intelligence?: number | null
          stat_luck?: number | null
          stat_power?: number | null
          stat_skill?: number | null
          stat_speed?: number | null
          stat_stamina?: number | null
          stat_strength?: number | null
          sub_race?: string | null
          updated_at?: string
          user_id?: string
          weapons_items?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "characters_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_solar_system_id_fkey"
            columns: ["solar_system_id"]
            isOneToOne: false
            referencedRelation: "solar_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_battle_locations: {
        Row: {
          countdown_seconds: number | null
          created_at: string
          description: string | null
          hazard_description: string | null
          id: string
          is_emergency: boolean | null
          name: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          countdown_seconds?: number | null
          created_at?: string
          description?: string | null
          hazard_description?: string | null
          id?: string
          is_emergency?: boolean | null
          name: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          countdown_seconds?: number | null
          created_at?: string
          description?: string | null
          hazard_description?: string | null
          id?: string
          is_emergency?: boolean | null
          name?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      encryption_config: {
        Row: {
          encryption_key: string
          id: number
        }
        Insert: {
          encryption_key: string
          id?: number
        }
        Update: {
          encryption_key?: string
          id?: number
        }
        Relationships: []
      }
      factions: {
        Row: {
          allies: Json
          campaign_id: string
          created_at: string
          current_conflicts: Json
          faction_goals: string | null
          faction_name: string
          id: string
          military_strength: number
          rivals: Json
          territory_regions: Json
          updated_at: string
        }
        Insert: {
          allies?: Json
          campaign_id: string
          created_at?: string
          current_conflicts?: Json
          faction_goals?: string | null
          faction_name: string
          id?: string
          military_strength?: number
          rivals?: Json
          territory_regions?: Json
          updated_at?: string
        }
        Update: {
          allies?: Json
          campaign_id?: string
          created_at?: string
          current_conflicts?: Json
          faction_goals?: string | null
          faction_name?: string
          id?: string
          military_strength?: number
          rivals?: Json
          territory_regions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          is_follow: boolean
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          is_follow?: boolean
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          is_follow?: boolean
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      galaxy_customizations: {
        Row: {
          background_type: string
          created_at: string
          custom_colors: Json | null
          galaxy_shape: string
          id: string
          updated_at: string
          user_id: string
          visual_effects: Json | null
        }
        Insert: {
          background_type?: string
          created_at?: string
          custom_colors?: Json | null
          galaxy_shape?: string
          id?: string
          updated_at?: string
          user_id: string
          visual_effects?: Json | null
        }
        Update: {
          background_type?: string
          created_at?: string
          custom_colors?: Json | null
          galaxy_shape?: string
          id?: string
          updated_at?: string
          user_id?: string
          visual_effects?: Json | null
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          character_id: string
          config_id: string
          created_at: string
          error: string | null
          fix_flags: Json | null
          fix_notes: string | null
          height_morph: number
          id: string
          logs: Json | null
          motion_mode: Database["public"]["Enums"]["motion_mode"]
          progress: number
          quality: Database["public"]["Enums"]["model_quality"]
          result_glb_url: string | null
          result_preview_url: string | null
          shoulders_morph: number
          status: Database["public"]["Enums"]["generation_status"]
          template: Database["public"]["Enums"]["character_template"]
          updated_at: string
          visual_style: Database["public"]["Enums"]["visual_style"]
        }
        Insert: {
          character_id: string
          config_id: string
          created_at?: string
          error?: string | null
          fix_flags?: Json | null
          fix_notes?: string | null
          height_morph: number
          id?: string
          logs?: Json | null
          motion_mode: Database["public"]["Enums"]["motion_mode"]
          progress?: number
          quality: Database["public"]["Enums"]["model_quality"]
          result_glb_url?: string | null
          result_preview_url?: string | null
          shoulders_morph: number
          status?: Database["public"]["Enums"]["generation_status"]
          template: Database["public"]["Enums"]["character_template"]
          updated_at?: string
          visual_style: Database["public"]["Enums"]["visual_style"]
        }
        Update: {
          character_id?: string
          config_id?: string
          created_at?: string
          error?: string | null
          fix_flags?: Json | null
          fix_notes?: string | null
          height_morph?: number
          id?: string
          logs?: Json | null
          motion_mode?: Database["public"]["Enums"]["motion_mode"]
          progress?: number
          quality?: Database["public"]["Enums"]["model_quality"]
          result_glb_url?: string | null
          result_preview_url?: string | null
          shoulders_morph?: number
          status?: Database["public"]["Enums"]["generation_status"]
          template?: Database["public"]["Enums"]["character_template"]
          updated_at?: string
          visual_style?: Database["public"]["Enums"]["visual_style"]
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "character_3d_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      moon_customizations: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_name: string | null
          gravity: number | null
          id: string
          moon_name: string
          planet_name: string
          radius: number | null
          solar_system_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          gravity?: number | null
          id?: string
          moon_name: string
          planet_name: string
          radius?: number | null
          solar_system_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          gravity?: number | null
          id?: string
          moon_name?: string
          planet_name?: string
          radius?: number | null
          solar_system_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moon_customizations_solar_system_id_fkey"
            columns: ["solar_system_id"]
            isOneToOne: false
            referencedRelation: "solar_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      narrator_sentiments: {
        Row: {
          amusement: number
          character_id: string
          combat_style_score: number
          created_at: string
          creativity_score: number
          curiosity: number
          disappointment: number
          exploration_score: number
          id: string
          intrigue: number
          memorable_moments: string[]
          narrator_observations: string[]
          nickname: string | null
          nickname_history: string[]
          npc_interaction_score: number
          opinion_summary: string | null
          personality_notes: string | null
          relationship_stage: string
          respect: number
          sentiment_score: number
          story_compatibility: number
          story_engagement_score: number
          story_value: number
          trust: number
          updated_at: string
          world_interaction_score: number
        }
        Insert: {
          amusement?: number
          character_id: string
          combat_style_score?: number
          created_at?: string
          creativity_score?: number
          curiosity?: number
          disappointment?: number
          exploration_score?: number
          id?: string
          intrigue?: number
          memorable_moments?: string[]
          narrator_observations?: string[]
          nickname?: string | null
          nickname_history?: string[]
          npc_interaction_score?: number
          opinion_summary?: string | null
          personality_notes?: string | null
          relationship_stage?: string
          respect?: number
          sentiment_score?: number
          story_compatibility?: number
          story_engagement_score?: number
          story_value?: number
          trust?: number
          updated_at?: string
          world_interaction_score?: number
        }
        Update: {
          amusement?: number
          character_id?: string
          combat_style_score?: number
          created_at?: string
          creativity_score?: number
          curiosity?: number
          disappointment?: number
          exploration_score?: number
          id?: string
          intrigue?: number
          memorable_moments?: string[]
          narrator_observations?: string[]
          nickname?: string | null
          nickname_history?: string[]
          npc_interaction_score?: number
          opinion_summary?: string | null
          personality_notes?: string | null
          relationship_stage?: string
          respect?: number
          sentiment_score?: number
          story_compatibility?: number
          story_engagement_score?: number
          story_value?: number
          trust?: number
          updated_at?: string
          world_interaction_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "narrator_sentiments_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "narrator_sentiments_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: true
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      npc_relationships: {
        Row: {
          campaign_id: string
          character_id: string
          created_at: string
          disposition: string
          id: string
          last_interaction_day: number | null
          notes: string | null
          npc_id: string
          trust_level: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          character_id: string
          created_at?: string
          disposition?: string
          id?: string
          last_interaction_day?: number | null
          notes?: string | null
          npc_id: string
          trust_level?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          character_id?: string
          created_at?: string
          disposition?: string
          id?: string
          last_interaction_day?: number | null
          notes?: string | null
          npc_id?: string
          trust_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "npc_relationships_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npc_relationships_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npc_relationships_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "npc_relationships_npc_id_fkey"
            columns: ["npc_id"]
            isOneToOne: false
            referencedRelation: "campaign_npcs"
            referencedColumns: ["id"]
          },
        ]
      }
      planet_customizations: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_name: string | null
          gravity: number | null
          has_rings: boolean | null
          id: string
          moon_count: number | null
          orbital_distance: number | null
          planet_name: string
          radius: number | null
          solar_system_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          gravity?: number | null
          has_rings?: boolean | null
          id?: string
          moon_count?: number | null
          orbital_distance?: number | null
          planet_name: string
          radius?: number | null
          solar_system_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          gravity?: number | null
          has_rings?: boolean | null
          id?: string
          moon_count?: number | null
          orbital_distance?: number | null
          planet_name?: string
          radius?: number | null
          solar_system_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planet_customizations_solar_system_id_fkey"
            columns: ["solar_system_id"]
            isOneToOne: false
            referencedRelation: "solar_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          battle_turn_color: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          hide_friends_list: boolean
          id: string
          is_private: boolean
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          battle_turn_color?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          hide_friends_list?: boolean
          id: string
          is_private?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          battle_turn_color?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          hide_friends_list?: boolean
          id?: string
          is_private?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      races: {
        Row: {
          average_lifespan: string | null
          created_at: string
          cultural_traits: string | null
          description: string | null
          home_planet: string | null
          id: string
          image_url: string | null
          name: string
          typical_abilities: string | null
          typical_physiology: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          average_lifespan?: string | null
          created_at?: string
          cultural_traits?: string | null
          description?: string | null
          home_planet?: string | null
          id?: string
          image_url?: string | null
          name: string
          typical_abilities?: string | null
          typical_physiology?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          average_lifespan?: string | null
          created_at?: string
          cultural_traits?: string | null
          description?: string | null
          home_planet?: string | null
          id?: string
          image_url?: string | null
          name?: string
          typical_abilities?: string | null
          typical_physiology?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regional_social_state: {
        Row: {
          campaign_id: string
          civilian_heat: number
          community_heat: number
          created_at: string
          criminal_heat: number
          faction_heat: number
          guard_heat: number
          id: string
          merchant_heat: number
          mood_drivers: Json
          region_name: string
          social_memory: Json
          updated_at: string
          world_mood: string
        }
        Insert: {
          campaign_id: string
          civilian_heat?: number
          community_heat?: number
          created_at?: string
          criminal_heat?: number
          faction_heat?: number
          guard_heat?: number
          id?: string
          merchant_heat?: number
          mood_drivers?: Json
          region_name: string
          social_memory?: Json
          updated_at?: string
          world_mood?: string
        }
        Update: {
          campaign_id?: string
          civilian_heat?: number
          community_heat?: number
          created_at?: string
          criminal_heat?: number
          faction_heat?: number
          guard_heat?: number
          id?: string
          merchant_heat?: number
          mood_drivers?: Json
          region_name?: string
          social_memory?: Json
          updated_at?: string
          world_mood?: string
        }
        Relationships: [
          {
            foreignKeyName: "regional_social_state_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_battle_themes: {
        Row: {
          composition: Json
          created_at: string
          description: string | null
          id: string
          name: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          composition?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          composition?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      solar_systems: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          character_id: string | null
          content: string
          created_at: string
          id: string
          is_published: boolean
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          character_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          character_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      story_chapters: {
        Row: {
          chapter_number: number
          content: string
          created_at: string
          id: string
          story_id: string
          title: string
          updated_at: string
        }
        Insert: {
          chapter_number?: number
          content: string
          created_at?: string
          id?: string
          story_id: string
          title: string
          updated_at?: string
        }
        Update: {
          chapter_number?: number
          content?: string
          created_at?: string
          id?: string
          story_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_chapters_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_chapters_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      story_characters: {
        Row: {
          character_id: string
          created_at: string
          id: string
          story_id: string
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          story_id: string
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_characters_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_characters_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_characters_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_characters_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_races: {
        Row: {
          created_at: string
          cultural_traits: string | null
          description: string | null
          id: string
          name: string
          race_id: string
          typical_abilities: string | null
          typical_physiology: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cultural_traits?: string | null
          description?: string | null
          id?: string
          name: string
          race_id: string
          typical_abilities?: string | null
          typical_physiology?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cultural_traits?: string | null
          description?: string | null
          id?: string
          name?: string
          race_id?: string
          typical_abilities?: string | null
          typical_physiology?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_races_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_races_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      sun_customizations: {
        Row: {
          color: string
          created_at: string
          description: string | null
          has_sun: boolean
          id: string
          name: string | null
          solar_system_id: string | null
          temperature: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          has_sun?: boolean
          id?: string
          name?: string | null
          solar_system_id?: string | null
          temperature?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          has_sun?: boolean
          id?: string
          name?: string | null
          solar_system_id?: string | null
          temperature?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sun_customizations_solar_system_id_fkey"
            columns: ["solar_system_id"]
            isOneToOne: false
            referencedRelation: "solar_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      tester_feedback: {
        Row: {
          campaign_id: string | null
          category: string
          context: Json | null
          created_at: string
          feedback: string
          id: string
          message_id: string | null
          resolved: boolean
          severity: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          category?: string
          context?: Json | null
          created_at?: string
          feedback: string
          id?: string
          message_id?: string | null
          resolved?: boolean
          severity?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          category?: string
          context?: Json | null
          created_at?: string
          feedback?: string
          id?: string
          message_id?: string | null
          resolved?: boolean
          severity?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tester_profiles: {
        Row: {
          created_at: string
          id: string
          is_tester: boolean
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_tester?: boolean
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_tester?: boolean
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          ai_subscription_active: boolean
          ai_subscription_expires: string | null
          created_at: string
          founder_status: boolean
          storage_tier: string
          user_id: string
        }
        Insert: {
          ai_subscription_active?: boolean
          ai_subscription_expires?: string | null
          created_at?: string
          founder_status?: boolean
          storage_tier?: string
          user_id: string
        }
        Update: {
          ai_subscription_active?: boolean
          ai_subscription_expires?: string | null
          created_at?: string
          founder_status?: boolean
          storage_tier?: string
          user_id?: string
        }
        Relationships: []
      }
      world_events: {
        Row: {
          campaign_id: string
          created_at: string
          description: string
          event_type: string
          id: string
          impact_level: number
          location: string | null
          participants: Json
          player_proximity: number
          resolved: boolean
          story_relevance: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          impact_level?: number
          location?: string | null
          participants?: Json
          player_proximity?: number
          resolved?: boolean
          story_relevance?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          impact_level?: number
          location?: string | null
          participants?: Json
          player_proximity?: number
          resolved?: boolean
          story_relevance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      world_rumors: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          origin_location: string | null
          related_event_id: string | null
          rumor_text: string
          spread_level: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          origin_location?: string | null
          related_event_id?: string | null
          rumor_text: string
          spread_level?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          origin_location?: string | null
          related_event_id?: string | null
          rumor_text?: string
          spread_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "world_rumors_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_rumors_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "world_events"
            referencedColumns: ["id"]
          },
        ]
      }
      world_state: {
        Row: {
          active_events: Json
          campaign_id: string
          created_at: string
          danger_level: number
          environment_conditions: Json
          faction_activity_summary: string | null
          id: string
          last_simulated_at: string
          npc_activity_summary: string | null
          region_name: string
          updated_at: string
        }
        Insert: {
          active_events?: Json
          campaign_id: string
          created_at?: string
          danger_level?: number
          environment_conditions?: Json
          faction_activity_summary?: string | null
          id?: string
          last_simulated_at?: string
          npc_activity_summary?: string | null
          region_name?: string
          updated_at?: string
        }
        Update: {
          active_events?: Json
          campaign_id?: string
          created_at?: string
          danger_level?: number
          environment_conditions?: Json
          faction_activity_summary?: string | null
          id?: string
          last_simulated_at?: string
          npc_activity_summary?: string | null
          region_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "world_state_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      character_ai_notes_decrypted: {
        Row: {
          battle_id: string | null
          category: string | null
          character_id: string | null
          created_at: string | null
          id: string | null
          note: string | null
          scope: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          battle_id?: string | null
          category?: string | null
          character_id?: string | null
          created_at?: string | null
          id?: string | null
          note?: never
          scope?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          battle_id?: string | null
          category?: string | null
          character_id?: string | null
          created_at?: string | null
          id?: string | null
          note?: never
          scope?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_ai_notes_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_ai_notes_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_ai_notes_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      character_constructs_decrypted: {
        Row: {
          behavior_summary: string | null
          character_id: string | null
          construct_type: string | null
          created_at: string | null
          durability_level: string | null
          durability_numeric: number | null
          id: string | null
          limitations: string | null
          name: string | null
          persistence: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          behavior_summary?: never
          character_id?: string | null
          construct_type?: string | null
          created_at?: string | null
          durability_level?: string | null
          durability_numeric?: number | null
          id?: string | null
          limitations?: never
          name?: string | null
          persistence?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          behavior_summary?: never
          character_id?: string | null
          construct_type?: string | null
          created_at?: string | null
          durability_level?: string | null
          durability_numeric?: number | null
          id?: string | null
          limitations?: never
          name?: string | null
          persistence?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_constructs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_constructs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      character_sections_decrypted: {
        Row: {
          body: string | null
          character_id: string | null
          created_at: string | null
          id: string | null
          sort_order: number | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body?: never
          character_id?: string | null
          created_at?: string | null
          id?: string | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: never
          character_id?: string | null
          created_at?: string | null
          id?: string | null
          sort_order?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "character_sections_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_sections_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      characters_decrypted: {
        Row: {
          abilities: string | null
          age: number | null
          appearance_aura: string | null
          appearance_build: string | null
          appearance_clothing_style: string | null
          appearance_description: string | null
          appearance_distinct_features: string | null
          appearance_eyes: string | null
          appearance_hair: string | null
          appearance_height: string | null
          appearance_movement_style: string | null
          appearance_posture: string | null
          appearance_typical_expression: string | null
          appearance_voice: string | null
          created_at: string | null
          home_moon: string | null
          home_planet: string | null
          id: string | null
          image_url: string | null
          level: number | null
          lore: string | null
          mentality: string | null
          name: string | null
          personality: string | null
          powers: string | null
          race: string | null
          race_id: string | null
          sex: string | null
          solar_system_id: string | null
          stat_battle_iq: number | null
          stat_durability: number | null
          stat_intelligence: number | null
          stat_luck: number | null
          stat_power: number | null
          stat_skill: number | null
          stat_speed: number | null
          stat_stamina: number | null
          stat_strength: number | null
          sub_race: string | null
          updated_at: string | null
          user_id: string | null
          weapons_items: string | null
        }
        Insert: {
          abilities?: never
          age?: number | null
          appearance_aura?: string | null
          appearance_build?: string | null
          appearance_clothing_style?: string | null
          appearance_description?: string | null
          appearance_distinct_features?: string | null
          appearance_eyes?: string | null
          appearance_hair?: string | null
          appearance_height?: string | null
          appearance_movement_style?: string | null
          appearance_posture?: string | null
          appearance_typical_expression?: string | null
          appearance_voice?: string | null
          created_at?: string | null
          home_moon?: string | null
          home_planet?: string | null
          id?: string | null
          image_url?: string | null
          level?: number | null
          lore?: never
          mentality?: never
          name?: string | null
          personality?: never
          powers?: never
          race?: string | null
          race_id?: string | null
          sex?: string | null
          solar_system_id?: string | null
          stat_battle_iq?: number | null
          stat_durability?: number | null
          stat_intelligence?: number | null
          stat_luck?: number | null
          stat_power?: number | null
          stat_skill?: number | null
          stat_speed?: number | null
          stat_stamina?: number | null
          stat_strength?: number | null
          sub_race?: string | null
          updated_at?: string | null
          user_id?: string | null
          weapons_items?: never
        }
        Update: {
          abilities?: never
          age?: number | null
          appearance_aura?: string | null
          appearance_build?: string | null
          appearance_clothing_style?: string | null
          appearance_description?: string | null
          appearance_distinct_features?: string | null
          appearance_eyes?: string | null
          appearance_hair?: string | null
          appearance_height?: string | null
          appearance_movement_style?: string | null
          appearance_posture?: string | null
          appearance_typical_expression?: string | null
          appearance_voice?: string | null
          created_at?: string | null
          home_moon?: string | null
          home_planet?: string | null
          id?: string | null
          image_url?: string | null
          level?: number | null
          lore?: never
          mentality?: never
          name?: string | null
          personality?: never
          powers?: never
          race?: string | null
          race_id?: string | null
          sex?: string | null
          solar_system_id?: string | null
          stat_battle_iq?: number | null
          stat_durability?: number | null
          stat_intelligence?: number | null
          stat_luck?: number | null
          stat_power?: number | null
          stat_skill?: number | null
          stat_speed?: number | null
          stat_stamina?: number | null
          stat_strength?: number | null
          sub_race?: string | null
          updated_at?: string | null
          user_id?: string | null
          weapons_items?: never
        }
        Relationships: [
          {
            foreignKeyName: "characters_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races_decrypted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_solar_system_id_fkey"
            columns: ["solar_system_id"]
            isOneToOne: false
            referencedRelation: "solar_systems"
            referencedColumns: ["id"]
          },
        ]
      }
      races_decrypted: {
        Row: {
          average_lifespan: string | null
          created_at: string | null
          cultural_traits: string | null
          description: string | null
          home_planet: string | null
          id: string | null
          image_url: string | null
          name: string | null
          typical_abilities: string | null
          typical_physiology: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          average_lifespan?: string | null
          created_at?: string | null
          cultural_traits?: never
          description?: never
          home_planet?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          typical_abilities?: never
          typical_physiology?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          average_lifespan?: string | null
          created_at?: string | null
          cultural_traits?: never
          description?: never
          home_planet?: string | null
          id?: string | null
          image_url?: string | null
          name?: string | null
          typical_abilities?: never
          typical_physiology?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stories_decrypted: {
        Row: {
          character_id: string | null
          content: string | null
          created_at: string | null
          id: string | null
          is_published: boolean | null
          summary: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          character_id?: string | null
          content?: never
          created_at?: string | null
          id?: string | null
          is_published?: boolean | null
          summary?: never
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          character_id?: string | null
          content?: never
          created_at?: string | null
          id?: string | null
          is_published?: boolean | null
          summary?: never
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      story_chapters_decrypted: {
        Row: {
          chapter_number: number | null
          content: string | null
          created_at: string | null
          id: string | null
          story_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          chapter_number?: number | null
          content?: never
          created_at?: string | null
          id?: string | null
          story_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          chapter_number?: number | null
          content?: never
          created_at?: string | null
          id?: string | null
          story_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_chapters_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_chapters_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_races_decrypted: {
        Row: {
          created_at: string | null
          cultural_traits: string | null
          description: string | null
          id: string | null
          name: string | null
          race_id: string | null
          typical_abilities: string | null
          typical_physiology: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          cultural_traits?: never
          description?: never
          id?: string | null
          name?: string | null
          race_id?: string | null
          typical_abilities?: never
          typical_physiology?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          cultural_traits?: never
          description?: never
          id?: string | null
          name?: string | null
          race_id?: string | null
          typical_abilities?: never
          typical_physiology?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_races_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_races_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "races_decrypted"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      can_add_battle_participant: {
        Args: { _battle_id: string; _character_id: string }
        Returns: boolean
      }
      create_battle_challenge: {
        Args: {
          _challenged_user_id: string
          _challenger_character_id: string
          _location_1: string
        }
        Returns: string
      }
      decrypt_field: { Args: { encrypted_text: string }; Returns: string }
      encrypt_field: { Args: { plain_text: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_moderator: { Args: never; Returns: boolean }
      is_battle_creator: { Args: { _battle_id: string }; Returns: boolean }
      is_battle_participant: { Args: { _battle_id: string }; Returns: boolean }
      is_character_owner: { Args: { _character_id: string }; Returns: boolean }
      is_tester: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      battle_status: "pending" | "active" | "completed"
      campaign_status:
        | "recruiting"
        | "active"
        | "paused"
        | "completed"
        | "abandoned"
      campaign_time:
        | "dawn"
        | "morning"
        | "midday"
        | "afternoon"
        | "dusk"
        | "evening"
        | "night"
        | "midnight"
      character_template:
        | "adult_basic"
        | "adult_slim"
        | "adult_bulky"
        | "adult_longlimb"
        | "kid_basic"
        | "kid_slim"
        | "kid_bulky"
        | "kid_longlimb"
      generation_status: "none" | "queued" | "processing" | "done" | "error"
      image_role:
        | "front"
        | "side"
        | "back"
        | "three_quarter"
        | "detail"
        | "other"
      message_channel: "in_universe" | "out_of_universe"
      model_quality: "mobile_low" | "mobile_med" | "desktop"
      motion_mode: "static" | "idle" | "idle_interactive"
      visual_style: "toon" | "semi"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      battle_status: ["pending", "active", "completed"],
      campaign_status: [
        "recruiting",
        "active",
        "paused",
        "completed",
        "abandoned",
      ],
      campaign_time: [
        "dawn",
        "morning",
        "midday",
        "afternoon",
        "dusk",
        "evening",
        "night",
        "midnight",
      ],
      character_template: [
        "adult_basic",
        "adult_slim",
        "adult_bulky",
        "adult_longlimb",
        "kid_basic",
        "kid_slim",
        "kid_bulky",
        "kid_longlimb",
      ],
      generation_status: ["none", "queued", "processing", "done", "error"],
      image_role: ["front", "side", "back", "three_quarter", "detail", "other"],
      message_channel: ["in_universe", "out_of_universe"],
      model_quality: ["mobile_low", "mobile_med", "desktop"],
      motion_mode: ["static", "idle", "idle_interactive"],
      visual_style: ["toon", "semi"],
    },
  },
} as const
