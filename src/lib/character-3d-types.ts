// Types for the 2D→3D Character Generation System

export type CharacterTemplate =
  | 'adult_basic' | 'adult_slim' | 'adult_bulky' | 'adult_longlimb'
  | 'kid_basic' | 'kid_slim' | 'kid_bulky' | 'kid_longlimb';

export type VisualStyle = 'toon' | 'semi';
export type MotionMode = 'static' | 'idle' | 'idle_interactive';
export type ModelQuality = 'mobile_low' | 'mobile_med' | 'desktop';
export type GenerationStatus = 'none' | 'queued' | 'processing' | 'done' | 'error';
export type ImageRole = 'front' | 'side' | 'back' | 'three_quarter' | 'detail' | 'other';

export interface Character3DConfig {
  id: string;
  character_id: string;
  template: CharacterTemplate;
  visual_style: VisualStyle;
  motion_mode: MotionMode;
  quality: ModelQuality;
  height_morph: number;
  shoulders_morph: number;
  model_glb_url: string | null;
  preview_url: string | null;
  current_status: GenerationStatus;
  created_at: string;
  updated_at: string;
}

export interface CharacterImage {
  id: string;
  character_id: string;
  storage_path: string;
  image_url: string;
  role: ImageRole;
  display_order: number;
  created_at: string;
}

export interface GenerationJob {
  id: string;
  character_id: string;
  config_id: string;
  status: GenerationStatus;
  progress: number;
  logs: string[];
  template: CharacterTemplate;
  height_morph: number;
  shoulders_morph: number;
  visual_style: VisualStyle;
  motion_mode: MotionMode;
  quality: ModelQuality;
  result_glb_url: string | null;
  result_preview_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateOption {
  value: CharacterTemplate;
  label: string;
  group: 'adult' | 'kid';
  description: string;
}

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  { value: 'adult_basic', label: 'Basic', group: 'adult', description: 'Standard proportions' },
  { value: 'adult_slim', label: 'Slim', group: 'adult', description: 'Lean, athletic build' },
  { value: 'adult_bulky', label: 'Bulky', group: 'adult', description: 'Muscular, heavy build' },
  { value: 'adult_longlimb', label: 'Long Limb', group: 'adult', description: 'Elongated proportions' },
  { value: 'kid_basic', label: 'Basic', group: 'kid', description: 'Standard child proportions' },
  { value: 'kid_slim', label: 'Slim', group: 'kid', description: 'Lean child build' },
  { value: 'kid_bulky', label: 'Bulky', group: 'kid', description: 'Stocky child build' },
  { value: 'kid_longlimb', label: 'Long Limb', group: 'kid', description: 'Lanky child proportions' },
];

export const IMAGE_ROLE_OPTIONS: { value: ImageRole; label: string; description: string }[] = [
  { value: 'front', label: 'Front', description: 'Primary front-facing view' },
  { value: 'side', label: 'Side', description: 'Profile/side view' },
  { value: 'back', label: 'Back', description: 'Rear view' },
  { value: 'three_quarter', label: '3/4 View', description: 'Angled perspective' },
  { value: 'detail', label: 'Detail', description: 'Close-up details' },
  { value: 'other', label: 'Other', description: 'Additional reference' },
];

export const VISUAL_STYLE_OPTIONS: { value: VisualStyle; label: string; description: string }[] = [
  { value: 'toon', label: 'Toon', description: 'Cel-shaded, cartoon style' },
  { value: 'semi', label: 'Semi-Organic', description: 'Subtle shading, realistic feel' },
];

export const MOTION_MODE_OPTIONS: { value: MotionMode; label: string; description: string }[] = [
  { value: 'static', label: 'Static', description: 'No animation' },
  { value: 'idle', label: 'Idle', description: 'Subtle breathing animation' },
  { value: 'idle_interactive', label: 'Interactive', description: 'Responds to interaction' },
];

export const QUALITY_OPTIONS: { value: ModelQuality; label: string; description: string }[] = [
  { value: 'mobile_low', label: 'Mobile Low', description: '~2K polys, fast loading' },
  { value: 'mobile_med', label: 'Mobile Med', description: '~6K polys, balanced' },
  { value: 'desktop', label: 'Desktop', description: '~20K polys, high detail' },
];

// Default config values
export const DEFAULT_3D_CONFIG = {
  template: 'adult_basic' as CharacterTemplate,
  visual_style: 'toon' as VisualStyle,
  motion_mode: 'static' as MotionMode,
  quality: 'mobile_med' as ModelQuality,
  height_morph: 1.0,
  shoulders_morph: 1.0,
};

// Provider interface for future image→3D swapping
export interface MeshProvider {
  generateMesh(characterId: string, config: Character3DConfig, images: CharacterImage[]): Promise<string>;
}

// Template-based provider (v1)
export class TemplateMeshProvider implements MeshProvider {
  async generateMesh(characterId: string, config: Character3DConfig, images: CharacterImage[]): Promise<string> {
    // This will be replaced with actual backend call
    // For now, returns a placeholder that the backend will handle
    return `/api/generate/${characterId}`;
  }
}
