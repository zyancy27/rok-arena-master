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
      battle_messages: {
        Row: {
          battle_id: string
          channel: Database["public"]["Enums"]["message_channel"]
          character_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          battle_id: string
          channel?: Database["public"]["Enums"]["message_channel"]
          character_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          battle_id?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          character_id?: string
          content?: string
          created_at?: string
          id?: string
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
        ]
      }
      battle_participants: {
        Row: {
          battle_id: string
          character_id: string
          created_at: string
          id: string
          turn_order: number
        }
        Insert: {
          battle_id: string
          character_id: string
          created_at?: string
          id?: string
          turn_order?: number
        }
        Update: {
          battle_id?: string
          character_id?: string
          created_at?: string
          id?: string
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
        ]
      }
      battles: {
        Row: {
          chosen_location: string | null
          coin_flip_winner_id: string | null
          concentration_uses: Json | null
          created_at: string
          dynamic_environment: boolean
          environment_effects: string | null
          id: string
          location_1: string | null
          location_2: string | null
          loser_id: string | null
          status: Database["public"]["Enums"]["battle_status"]
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          chosen_location?: string | null
          coin_flip_winner_id?: string | null
          concentration_uses?: Json | null
          created_at?: string
          dynamic_environment?: boolean
          environment_effects?: string | null
          id?: string
          location_1?: string | null
          location_2?: string | null
          loser_id?: string | null
          status?: Database["public"]["Enums"]["battle_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          chosen_location?: string | null
          coin_flip_winner_id?: string | null
          concentration_uses?: Json | null
          created_at?: string
          dynamic_environment?: boolean
          environment_effects?: string | null
          id?: string
          location_1?: string | null
          location_2?: string | null
          loser_id?: string | null
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
            foreignKeyName: "battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      characters: {
        Row: {
          abilities: string | null
          age: number | null
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
        }
        Insert: {
          abilities?: string | null
          age?: number | null
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
        }
        Update: {
          abilities?: string | null
          age?: number | null
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
            foreignKeyName: "characters_solar_system_id_fkey"
            columns: ["solar_system_id"]
            isOneToOne: false
            referencedRelation: "solar_systems"
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
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_private: boolean
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_private?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
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
            foreignKeyName: "story_characters_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
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
    }
    Views: {
      [_ in never]: never
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      battle_status: "pending" | "active" | "completed"
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
