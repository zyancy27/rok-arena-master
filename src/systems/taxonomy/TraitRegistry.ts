export type TraitCategory =
  | 'combat'
  | 'personality'
  | 'environment'
  | 'narrative'
  | 'effect'
  | 'relationship'
  | 'faction';

export interface TraitDefinition {
  id: string;
  label: string;
  category: TraitCategory;
  tags?: string[];
  weight?: number;
  metadata?: Record<string, unknown>;
}

class TraitRegistryStore {
  private traits = new Map<string, TraitDefinition>();

  register(definition: TraitDefinition) {
    this.traits.set(definition.id, definition);
    return definition;
  }

  registerMany(definitions: TraitDefinition[]) {
    definitions.forEach((definition) => this.register(definition));
    return definitions;
  }

  get(id: string) {
    return this.traits.get(id) ?? null;
  }

  list(category?: TraitCategory) {
    const values = [...this.traits.values()];
    return category ? values.filter((trait) => trait.category === category) : values;
  }
}

export const TraitRegistry = new TraitRegistryStore();

TraitRegistry.registerMany([
  { id: 'close_quarters', label: 'Close Quarters', category: 'combat', tags: ['melee', 'pressure'] },
  { id: 'ranged_control', label: 'Ranged Control', category: 'combat', tags: ['range', 'control'] },
  { id: 'cautious', label: 'Cautious', category: 'personality', tags: ['measured'] },
  { id: 'aggressive', label: 'Aggressive', category: 'personality', tags: ['pressure'] },
  { id: 'hazard_dense', label: 'Hazard Dense', category: 'environment', tags: ['hazard', 'danger'] },
  { id: 'escalating', label: 'Escalating', category: 'narrative', tags: ['stakes', 'pressure'] },
  { id: 'ambient_pulse', label: 'Ambient Pulse', category: 'effect', tags: ['pulse', 'atmosphere'] },
  { id: 'guarded', label: 'Guarded', category: 'relationship', tags: ['distance'] },
  { id: 'territorial', label: 'Territorial', category: 'faction', tags: ['control', 'region'] },
]);
