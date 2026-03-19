export type TagCategory =
  | 'combat_style'
  | 'personality'
  | 'environment'
  | 'pressure'
  | 'effect'
  | 'faction'
  | 'relationship'
  | 'campaign_tone';

export interface TagDefinition {
  id: string;
  category: TagCategory;
  description: string;
}

class TagRegistryStore {
  private tags = new Map<string, TagDefinition>();

  register(definition: TagDefinition) {
    this.tags.set(definition.id, definition);
    return definition;
  }

  registerMany(definitions: TagDefinition[]) {
    definitions.forEach((definition) => this.register(definition));
    return definitions;
  }

  get(id: string) {
    return this.tags.get(id) ?? null;
  }

  list(category?: TagCategory) {
    const values = [...this.tags.values()];
    return category ? values.filter((tag) => tag.category === category) : values;
  }
}

export const TagRegistry = new TagRegistryStore();

TagRegistry.registerMany([
  { id: 'melee', category: 'combat_style', description: 'Close engagement pressure.' },
  { id: 'ranged', category: 'combat_style', description: 'Maintains distance and lane control.' },
  { id: 'stoic', category: 'personality', description: 'Emotionally restrained and disciplined.' },
  { id: 'volatile', category: 'personality', description: 'Emotionally explosive and unstable.' },
  { id: 'ruins', category: 'environment', description: 'Collapsed or aging structural space.' },
  { id: 'hazardous', category: 'environment', description: 'Environmental danger is active.' },
  { id: 'survival_pressure', category: 'pressure', description: 'Immediate risk of failure or collapse.' },
  { id: 'audio_reactive', category: 'effect', description: 'Effect should respond to sound emphasis.' },
  { id: 'occupation_force', category: 'faction', description: 'Territory held by force projection.' },
  { id: 'distrust', category: 'relationship', description: 'Relationship leans toward caution or hostility.' },
  { id: 'mystic', category: 'campaign_tone', description: 'Campaign tone leans mystical and unknown.' },
]);
